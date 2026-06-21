// <visual-qa-inspector> Web Component. Renders the web-QA property panel (F4)
// per SIDEBAR_SPEC.md inside a Shadow DOM. Pure function of the InspectorStore;
// wires the Picker and TokenResolver.

import { InspectorStore } from "../core/store";
import { Picker } from "../core/picker";
import { TokenResolver, type TokenSource } from "../core/tokens";
import { SCHEMA } from "../core/schema";
import { buildPrompt } from "../core/prompt";
import { elementContext, buildSelector } from "../core/selector";
import type { GroupSchema, PropSchema, TokenFamily } from "../core/types";
import { PANEL_CSS } from "./panel.css";

export interface InspectorOptions {
  tokens?: TokenSource;
}

const JUSTIFY = ["flex-start", "center", "flex-end"];
const ALIGN = ["flex-start", "center", "flex-end"];

export class VisualQAInspector extends HTMLElement {
  readonly store = new InspectorStore();
  readonly resolver = new TokenResolver();
  private picker!: Picker;
  private panelEl!: HTMLDivElement;
  private launchEl!: HTMLButtonElement;
  private drawerEl: HTMLDivElement | null = null;
  private drawerOpen = false;
  private perSide = new Set<string>(); // which spacing controls are expanded

  connectedCallback(): void {
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = PANEL_CSS;
    const wrap = document.createElement("div");
    wrap.className = "wrap";
    this.panelEl = el("div", "panel");
    this.launchEl = document.createElement("button");
    this.launchEl.className = "launch";
    wrap.append(this.panelEl, this.launchEl);
    root.append(style, wrap);

    const opts: InspectorOptions = (this as { _opts?: InspectorOptions })._opts ?? {};
    this.resolver.init(opts.tokens);

    this.picker = new Picker(this.store, { host: this, onToggle: () => this.renderLaunch() });
    this.launchEl.onclick = () => this.picker.toggle();
    this.store.subscribe(() => this.render());
    this.render();
  }

  configure(opts: InspectorOptions): void {
    (this as { _opts?: InspectorOptions })._opts = opts;
  }

  // ---------- top-level render ----------
  private render(): void {
    this.renderLaunch();
    this.renderPanel();
    this.renderDrawer();
  }

  private renderLaunch(): void {
    const active = this.picker?.isActive;
    const n = this.store.changeCount();
    this.launchEl.classList.toggle("active", !!active);
    this.launchEl.textContent = active ? "Esc to cancel" : n ? `Inspect · ${n}` : "Inspect";
    // Shift the launcher clear of the panel/footer when the panel is open.
    this.launchEl.style.right = this.store.selected ? "284px" : "20px";
  }

  private renderPanel(): void {
    const sel = this.store.selected;
    this.panelEl.classList.toggle("open", !!sel);
    this.panelEl.innerHTML = "";
    if (!sel) return;

    const cs = getComputedStyle(sel);
    this.panelEl.append(this.header(sel));

    for (const group of SCHEMA) {
      if (group.showIf && !group.showIf(sel, cs)) continue;
      this.panelEl.append(this.section(sel, group, cs));
    }

    this.panelEl.append(this.footer(sel));
  }

  // ---------- header ----------
  private header(elm: HTMLElement): HTMLElement {
    const { tag, classes } = elementContext(elm);
    const box = el("div", "ident");

    const tagline = el("div", "tagline");
    tagline.innerHTML = `&lt;${tag}&gt; ` + classes.map((c) => `<span class="cls">.${c}</span>`).join(" ");
    box.append(tagline);

    // breadcrumb of ancestors
    const chain: HTMLElement[] = [];
    let node: HTMLElement | null = elm;
    while (node && node !== document.body && node.tagName !== "HTML") {
      chain.unshift(node);
      node = node.parentElement;
    }
    const crumb = el("div", "crumb");
    chain.forEach((n, i) => {
      const span = document.createElement("span");
      span.textContent = n.tagName.toLowerCase();
      span.onclick = () => this.store.select(n);
      if (n === elm) span.innerHTML = `<b>${n.tagName.toLowerCase()}</b>`;
      crumb.append(span);
      if (i < chain.length - 1) crumb.append(document.createTextNode(" / "));
    });
    box.append(crumb);

    const selector = el("div", "selector");
    selector.textContent = buildSelector(elm);
    selector.title = "Click to copy selector";
    selector.onclick = () => navigator.clipboard.writeText(buildSelector(elm));
    box.append(selector);
    return box;
  }

  // ---------- section ----------
  private section(elm: HTMLElement, group: GroupSchema, cs: CSSStyleDeclaration): HTMLElement {
    const sec = el("div", "sec");
    const head = el("div", "sech");
    head.append(Object.assign(el("span", "t"), { textContent: group.group }));

    const modCount = group.props.reduce(
      (n, p) => n + (p.control === "spacing" ? this.spacingModified(elm, p.css) : this.store.isModified(elm, p.css) ? 1 : 0),
      0
    );
    if (modCount) head.append(Object.assign(el("span", "badge"), { textContent: String(modCount) }));
    if (group.addable) {
      const add = el("span", "add");
      add.textContent = "+";
      head.append(add);
    }
    sec.append(head);

    for (const prop of group.props) {
      if (prop.showIf && !prop.showIf(elm, cs)) continue;
      const ctrl = this.control(elm, prop, cs);
      if (ctrl) sec.append(ctrl);
    }
    return sec;
  }

  // ---------- control dispatch ----------
  private control(elm: HTMLElement, prop: PropSchema, cs: CSSStyleDeclaration): HTMLElement | null {
    switch (prop.control) {
      case "color":
        return wrapRow(this.colorField(elm, prop, cs));
      case "segmented":
        return this.segmented(elm, prop, cs);
      case "align-grid":
        return this.alignGrid(elm, cs);
      case "spacing":
        return this.spacing(elm, prop, cs);
      case "select":
        return wrapRow(this.selectField(elm, prop, cs));
      default:
        return wrapRow(this.lengthField(elm, prop, cs));
    }
  }

  // ---------- length / text field ----------
  private lengthField(elm: HTMLElement, prop: PropSchema, cs: CSSStyleDeclaration): HTMLElement {
    const current = cs.getPropertyValue(prop.css).trim();
    const modified = this.store.isModified(elm, prop.css);
    const bound = this.boundToken(elm, prop, current);
    const f = el("div", "field");
    if (modified) f.classList.add("mod");
    if (bound) f.classList.add("bound");

    f.append(Object.assign(el("span", "gl"), { textContent: prop.label ?? prop.css }));

    if (bound) {
      f.append(Object.assign(el("span", "dia"), { textContent: "◇" }));
      f.append(Object.assign(el("span", "tok"), { textContent: prettyTok(bound) }));
    } else {
      const input = document.createElement("input");
      input.value = current || "";
      input.placeholder = "–";
      input.onchange = () => this.commit(elm, prop, input.value);
      f.append(input);
    }
    if (prop.family) f.append(this.varSelect(elm, prop));
    if (modified) f.append(this.revert(elm, prop.css));
    return f;
  }

  // ---------- color field ----------
  private colorField(elm: HTMLElement, prop: PropSchema, cs: CSSStyleDeclaration): HTMLElement {
    const current = cs.getPropertyValue(prop.css).trim();
    const modified = this.store.isModified(elm, prop.css);
    const bound = this.boundToken(elm, prop, current);
    const f = el("div", "fill");
    if (modified) f.classList.add("mod");
    if (bound) f.classList.add("bound");

    const sw = el("div", "sw");
    sw.style.background = current;
    const picker = document.createElement("input");
    picker.type = "color";
    picker.className = "pick";
    picker.value = toHex(current);
    picker.oninput = () => {
      this.store.setProp(elm, prop.css, picker.value);
    };
    const nm = el("div", "nm");
    nm.textContent = bound ? prettyTok(bound) : toHex(current);
    f.append(sw, picker, nm);
    if (prop.family) f.append(this.varSelect(elm, prop));
    if (modified) f.append(this.revert(elm, prop.css));
    return f;
  }

  // ---------- select field ----------
  private selectField(elm: HTMLElement, prop: PropSchema, cs: CSSStyleDeclaration): HTMLElement {
    const current = cs.getPropertyValue(prop.css).trim();
    const modified = this.store.isModified(elm, prop.css);
    const f = el("div", "field");
    if (modified) f.classList.add("mod");
    f.append(Object.assign(el("span", "gl"), { textContent: prop.label ?? prop.css }));

    // select with no options → free text (e.g. font-family)
    if (!prop.options || prop.options.length === 0) {
      const input = document.createElement("input");
      input.value = current;
      input.onchange = () => this.store.setProp(elm, prop.css, input.value);
      f.append(input);
    } else {
      const sel = document.createElement("select");
      sel.className = "val";
      const opts = prop.options.includes(current) ? prop.options : [current, ...prop.options];
      for (const o of opts) sel.append(new Option(o, o));
      sel.value = current;
      sel.onchange = () => this.store.setProp(elm, prop.css, sel.value);
      f.append(sel);
    }
    if (modified) f.append(this.revert(elm, prop.css));
    return f;
  }

  // ---------- segmented ----------
  private segmented(elm: HTMLElement, prop: PropSchema, cs: CSSStyleDeclaration): HTMLElement {
    const row = el("div", "row one");
    const seg = el("div", "seg");
    if (this.store.isModified(elm, prop.css)) seg.classList.add("mod");
    const current = cs.getPropertyValue(prop.css).trim();
    for (const o of prop.options ?? []) {
      const b = document.createElement("button");
      b.textContent = o;
      if (o === current || (prop.css === "display" && current.includes(o) && o !== "inline")) b.classList.add("on");
      b.onclick = () => this.store.setProp(elm, prop.css, o);
      seg.append(b);
    }
    row.append(seg);
    return row;
  }

  // ---------- align grid ----------
  private alignGrid(elm: HTMLElement, cs: CSSStyleDeclaration): HTMLElement {
    const row = el("div", "row one");
    const ar = el("div", "alirow");
    const grid = el("div", "grid9");
    const j = Math.max(0, JUSTIFY.indexOf(cs.justifyContent));
    const a = Math.max(0, ALIGN.indexOf(cs.alignItems));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = document.createElement("i");
        if (r === a && c === j) cell.classList.add("on");
        cell.onclick = () => this.store.setMany(elm, { "justify-content": JUSTIFY[c], "align-items": ALIGN[r] });
        grid.append(cell);
      }
    }
    ar.append(grid);
    row.append(ar);
    return row;
  }

  // ---------- spacing (padding / margin) ----------
  private spacingModified(elm: HTMLElement, base: string): number {
    return ["top", "right", "bottom", "left"].filter((s) => this.store.isModified(elm, `${base}-${s}`)).length;
  }

  private spacing(elm: HTMLElement, prop: PropSchema, cs: CSSStyleDeclaration): HTMLElement {
    const base = prop.css;
    const wrapEl = document.createElement("div");
    const head = el("div", "lbl");
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.append(document.createTextNode(base));
    const toggle = el("span", "spacing-toggle");
    toggle.textContent = "⊞";
    const expanded = this.perSide.has(base);
    if (expanded) toggle.classList.add("on");
    toggle.onclick = () => {
      if (expanded) this.perSide.delete(base);
      else this.perSide.add(base);
      this.render();
    };
    head.append(toggle);
    wrapEl.append(head);

    const sideField = (side: string, glyph: string) => {
      const css = `${base}-${side}`;
      const cur = cs.getPropertyValue(css).trim();
      const f = el("div", "field");
      if (this.store.isModified(elm, css)) f.classList.add("mod");
      f.append(Object.assign(el("span", "gl"), { textContent: glyph }));
      const input = document.createElement("input");
      input.value = cur;
      input.onchange = () => this.commit(elm, { css, family: prop.family, control: "length" }, input.value);
      f.append(input);
      if (this.store.isModified(elm, css)) f.append(this.revert(elm, css));
      return f;
    };

    if (!expanded) {
      const row = el("div", "row");
      // X = left/right, Y = top/bottom
      const xf = el("div", "field");
      xf.append(Object.assign(el("span", "gl"), { textContent: "↔" }));
      const xi = document.createElement("input");
      xi.value = cs.getPropertyValue(`${base}-left`).trim();
      xi.onchange = () => this.commitMany(elm, [`${base}-left`, `${base}-right`], prop.family, xi.value);
      xf.append(xi);
      const yf = el("div", "field");
      yf.append(Object.assign(el("span", "gl"), { textContent: "↕" }));
      const yi = document.createElement("input");
      yi.value = cs.getPropertyValue(`${base}-top`).trim();
      yi.onchange = () => this.commitMany(elm, [`${base}-top`, `${base}-bottom`], prop.family, yi.value);
      yf.append(yi);
      row.append(xf, yf);
      wrapEl.append(row);
    } else {
      const r1 = el("div", "row");
      r1.append(sideField("top", "T"), sideField("right", "R"));
      const r2 = el("div", "row");
      r2.append(sideField("bottom", "B"), sideField("left", "L"));
      wrapEl.append(r1, r2);
    }
    return wrapEl;
  }

  // ---------- footer ----------
  private footer(elm: HTMLElement): HTMLElement {
    const foot = el("div", "foot");
    const n = this.store.changeCount();
    const count = el("div", "count" + (n ? "" : " zero"));
    count.textContent = `${n} change${n === 1 ? "" : "s"}`;
    if (n) count.onclick = () => { this.drawerOpen = !this.drawerOpen; this.render(); };
    foot.append(count, el("div", "spacer"));

    const rs = document.createElement("button");
    rs.className = "rs";
    rs.textContent = "Reset element";
    rs.onclick = () => this.store.reset(elm);

    const cp = document.createElement("button");
    cp.className = "cp";
    cp.innerHTML = `<span>Copy config</span>`;
    cp.onclick = async () => {
      await navigator.clipboard.writeText(buildPrompt(this.store));
      cp.querySelector("span")!.textContent = "Copied ✓";
      setTimeout(() => (cp.querySelector("span")!.textContent = "Copy config"), 1200);
    };
    foot.append(rs, cp);
    return foot;
  }

  // ---------- changes drawer ----------
  private renderDrawer(): void {
    if (this.drawerEl) {
      this.drawerEl.remove();
      this.drawerEl = null;
    }
    if (!this.drawerOpen || !this.store.changeCount()) return;

    const root = this.shadowRoot!.querySelector(".wrap")!;
    const d = el("div", "drawer");
    const dh = el("div", "dh");
    dh.append(Object.assign(el("span", "t"), { textContent: "Changes" }));
    const x = el("span", "x");
    x.textContent = "✕";
    x.onclick = () => { this.drawerOpen = false; this.render(); };
    dh.append(x);
    d.append(dh);

    for (const [elm, map] of this.store.allEdited()) {
      const { tag, classes } = elementContext(elm);
      const grp = el("div", "grp");
      grp.append(Object.assign(el("div", "el"), { textContent: `<${tag}>${classes[0] ? " ." + classes[0] : ""}` }));
      for (const [css, edit] of Object.entries(map)) {
        if (edit.from === edit.to) continue;
        const row = el("div", "chg");
        row.innerHTML = `<span class="p">${css}</span> <span>${edit.from}</span> → <span class="to">${edit.token ?? edit.to}</span>`;
        const rv = el("span", "rv");
        rv.textContent = "↺";
        rv.onclick = () => this.store.revertProp(elm, css);
        row.append(rv);
        grp.append(row);
      }
      d.append(grp);
    }

    const dfoot = el("div", "dfoot");
    const rsa = document.createElement("button");
    rsa.className = "rsa";
    rsa.textContent = "Reset all";
    rsa.onclick = () => { this.store.resetAll(); this.drawerOpen = false; this.render(); };
    const cp = document.createElement("button");
    cp.className = "cp";
    cp.textContent = "Copy config";
    cp.onclick = () => navigator.clipboard.writeText(buildPrompt(this.store));
    dfoot.append(rsa, cp);
    d.append(dfoot);

    root.append(d);
    this.drawerEl = d;
  }

  // ---------- token helpers ----------
  private varSelect(elm: HTMLElement, prop: PropSchema): HTMLElement {
    const sel = document.createElement("select");
    sel.className = "varsel";
    sel.append(new Option("◇", ""));
    for (const t of this.resolver.allTokens(prop.family as TokenFamily)) {
      sel.append(new Option(prettyTok(t.name), "b:" + t.name));
    }
    sel.append(new Option("Detach", "detach"));
    sel.value = "";
    sel.onchange = () => {
      if (sel.value.startsWith("b:")) this.bind(elm, prop.css, sel.value.slice(2));
      else if (sel.value === "detach") this.unbind(elm, prop.css);
      sel.value = "";
    };
    return sel;
  }

  private bind(elm: HTMLElement, css: string, tokenName: string): void {
    const token = this.allTokensFlat().find((t) => t.name === tokenName);
    if (!token) return;
    const ref = token.name.startsWith("--") ? `var(${token.name})` : token.value;
    const display = token.name.startsWith("--") ? `var(${token.name})` : token.name;
    this.store.setProp(elm, css, ref, display);
  }

  private unbind(elm: HTMLElement, css: string): void {
    const raw = getComputedStyle(elm).getPropertyValue(css).trim();
    this.store.setProp(elm, css, raw);
  }

  private boundToken(elm: HTMLElement, prop: PropSchema, current: string): string | null {
    const edit = this.store.getEdits(elm)[prop.css];
    if (edit?.token) return edit.token;
    for (const cls of elm.classList) {
      const n = this.resolver.nameForClass(cls);
      if (n) return n;
    }
    if (prop.family) return this.resolver.nameForValue(current, prop.family);
    return null;
  }

  private commit(elm: HTMLElement, prop: { css: string; family?: TokenFamily; control: string }, value: string): void {
    const tok = prop.family ? this.resolver.nameForValue(value, prop.family) : null;
    this.store.setProp(elm, prop.css, value, tok ? this.resolver.asCssRef(tok) : undefined);
  }

  private commitMany(elm: HTMLElement, props: string[], family: TokenFamily | undefined, value: string): void {
    const tok = family ? this.resolver.nameForValue(value, family) : null;
    for (const css of props) this.store.setProp(elm, css, value, tok ? this.resolver.asCssRef(tok) : undefined);
  }

  private allTokensFlat() {
    return [
      ...this.resolver.allTokens("color"),
      ...this.resolver.allTokens("space"),
      ...this.resolver.allTokens("radius"),
      ...this.resolver.allTokens("size"),
      ...this.resolver.allTokens("shadow"),
      ...this.resolver.allTokens("other"),
    ];
  }

  private revert(elm: HTMLElement, css: string): HTMLElement {
    const r = el("span", "revert");
    r.textContent = "↺";
    r.title = "Reset to original";
    r.onclick = () => this.store.revertProp(elm, css);
    return r;
  }
}

// ---------- helpers ----------
function el(tag: string, cls = "", html?: string): HTMLDivElement {
  const n = document.createElement(tag) as HTMLDivElement;
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function wrapRow(field: HTMLElement): HTMLElement {
  const row = el("div", "row one");
  row.append(field);
  return row;
}
function prettyTok(name: string): string {
  return name.replace(/^var\(|\)$/g, "").replace(/^--/, "").replace(/\./g, "/").replace("-", "/");
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
