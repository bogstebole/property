// <visual-qa-inspector> Web Component. Renders the Figma-style panel inside a
// Shadow DOM (so host CSS and tool CSS never collide), wires the picker, store,
// and TokenResolver, and renders the panel as a pure function of the store.

import { InspectorStore } from "../core/store";
import { Picker } from "../core/picker";
import { TokenResolver, type TokenSource } from "../core/tokens";
import { SCHEMA, isTextElement } from "../core/schema";
import { buildPrompt } from "../core/prompt";
import { elementContext, buildSelector as buildSel } from "../core/selector";
import type { PropSchema, TokenFamily } from "../core/types";
import { PANEL_CSS } from "./panel.css";

export interface InspectorOptions {
  tokens?: TokenSource;
}

export class VisualQAInspector extends HTMLElement {
  readonly store = new InspectorStore();
  readonly resolver = new TokenResolver();
  private picker!: Picker;
  private root!: ShadowRoot;
  private panelEl!: HTMLDivElement;
  private launchEl!: HTMLButtonElement;

  connectedCallback(): void {
    this.root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    const wrap = document.createElement("div");
    wrap.className = "wrap";
    this.panelEl = document.createElement("div");
    this.panelEl.className = "panel";
    this.launchEl = document.createElement("button");
    this.launchEl.className = "launch";
    wrap.append(this.panelEl, this.launchEl);
    this.root.append(style, wrap);

    const opts: InspectorOptions = (this as { _opts?: InspectorOptions })._opts ?? {};
    this.resolver.init(opts.tokens);

    this.picker = new Picker(this.store, {
      host: this,
      onToggle: () => this.renderLaunch(),
    });

    this.launchEl.onclick = () => this.picker.toggle();
    this.store.subscribe(() => this.render());
    this.render();
  }

  /** Allow passing options before the element is connected. */
  configure(opts: InspectorOptions): void {
    (this as { _opts?: InspectorOptions })._opts = opts;
  }

  // ---------- render ----------
  private render(): void {
    this.renderLaunch();
    this.renderPanel();
  }

  private renderLaunch(): void {
    const active = this.picker?.isActive;
    const count = this.store.changeCount();
    this.launchEl.classList.toggle("active", !!active);
    this.launchEl.textContent = active ? "Esc to cancel" : count ? `Inspect · ${count}` : "Inspect";
  }

  private renderPanel(): void {
    const el = this.store.selected;
    this.panelEl.classList.toggle("open", !!el);
    this.panelEl.innerHTML = "";
    if (!el) return;

    const cs = getComputedStyle(el);
    const { tag, classes } = elementContext(el);
    const changed = Object.values(this.store.getEdits(el)).some((e) => e.from !== e.to);

    // header
    const head = div("head");
    head.innerHTML = `<span class="tag"><b>&lt;${tag}&gt;</b> ${classes.map((c) => "." + c).join(" ")}</span>`;
    if (changed) head.innerHTML += `<span class="mod">Modified</span>`;
    this.panelEl.append(head);
    this.panelEl.append(Object.assign(div("sel"), { textContent: buildSel(el) }));

    // sections
    for (const section of SCHEMA) {
      if (section.group === "Typography" && !isTextElement(el)) continue;
      const sec = div("sec");
      const sh = div("sech");
      sh.append(Object.assign(div("t"), { textContent: section.group }));
      sec.append(sh);
      for (const prop of section.props) sec.append(this.control(el, prop, cs));
      this.panelEl.append(sec);
    }

    // footer
    const foot = div("foot");
    const cp = document.createElement("button");
    cp.className = "cp";
    cp.textContent = "Copy config";
    cp.onclick = async () => {
      await navigator.clipboard.writeText(buildPrompt(this.store));
      cp.textContent = "Copied ✓";
      setTimeout(() => (cp.textContent = "Copy config"), 1200);
    };
    const rs = document.createElement("button");
    rs.className = "rs";
    rs.textContent = "Reset";
    rs.onclick = () => this.store.reset(el);
    foot.append(cp, rs);
    this.panelEl.append(foot);
  }

  // ---------- controls ----------
  private control(el: HTMLElement, prop: PropSchema, cs: CSSStyleDeclaration): HTMLElement {
    const current = cs.getPropertyValue(prop.css).trim();
    const row = div("row one");

    if (prop.control === "color") {
      row.append(this.fillRow(el, prop, current));
      return row;
    }
    if (prop.control === "select") {
      row.append(this.selectField(el, prop, current));
      return row;
    }
    row.append(this.textField(el, prop, current));
    return row;
  }

  private textField(el: HTMLElement, prop: PropSchema, current: string): HTMLElement {
    const f = div("fld");
    f.append(Object.assign(div("gl"), { textContent: prop.label ?? prop.css }));
    const input = document.createElement("input");
    input.value = this.displayValue(el, prop, current);
    input.onchange = () => this.commit(el, prop, input.value);
    f.append(input);
    const tok = this.tokenName(el, prop, current);
    if (tok) f.append(Object.assign(div("tokchip"), { textContent: tok }));
    return f;
  }

  private selectField(el: HTMLElement, prop: PropSchema, current: string): HTMLElement {
    const f = div("fld");
    f.append(Object.assign(div("gl"), { textContent: prop.label ?? prop.css }));
    const sel = document.createElement("select");
    for (const o of prop.options ?? []) sel.append(new Option(o, o));
    if ((prop.options ?? []).includes(current)) sel.value = current;
    sel.onchange = () => this.store.setProp(el, prop.css, sel.value);
    f.append(sel);
    return f;
  }

  private fillRow(el: HTMLElement, prop: PropSchema, current: string): HTMLElement {
    const f = div("fill");
    const sw = div("sw");
    sw.style.background = current;
    const tok = this.tokenName(el, prop, current);
    const nm = Object.assign(div("nm"), { textContent: tok ?? toHex(current) });
    const picker = document.createElement("input");
    picker.type = "color";
    picker.className = "picker";
    picker.value = toHex(current);
    picker.oninput = () => {
      this.store.setProp(el, prop.css, picker.value);
      sw.style.background = picker.value;
      nm.textContent = picker.value;
    };
    f.append(sw, nm, picker);
    return f;
  }

  // ---------- token helpers ----------
  private tokenName(el: HTMLElement, prop: PropSchema, current: string): string | null {
    if (!prop.family) return null;
    // class path first (recovers Tailwind names), then value match
    for (const cls of el.classList) {
      const byClass = this.resolver.nameForClass(cls);
      if (byClass) return byClass;
    }
    return this.resolver.nameForValue(current, prop.family as TokenFamily);
  }

  private displayValue(el: HTMLElement, prop: PropSchema, current: string): string {
    const tok = this.tokenName(el, prop, current);
    return tok ? this.resolver.asCssRef(tok) : current;
  }

  private commit(el: HTMLElement, prop: PropSchema, value: string): void {
    // If the value matches a token, store the token reference for the prompt.
    const tok = prop.family ? this.resolver.nameForValue(value, prop.family as TokenFamily) : null;
    this.store.setProp(el, prop.css, value, tok ? this.resolver.asCssRef(tok) : undefined);
  }
}

function div(cls: string): HTMLDivElement {
  const d = document.createElement("div");
  d.className = cls;
  return d;
}
function toHex(v: string): string {
  const m = v.match(/\d+/g);
  if (!m) return "#000000";
  return "#" + m.slice(0, 3).map((x) => Number(x).toString(16).padStart(2, "0")).join("");
}
let defined = false;
export function defineInspector(): void {
  if (!defined && !customElements.get("visual-qa-inspector")) {
    customElements.define("visual-qa-inspector", VisualQAInspector);
    defined = true;
  }
}
