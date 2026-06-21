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
import { ColorPicker } from "./colorpicker";
import { VarPopover } from "./varpopover";
import { PANEL_CSS } from "./panel.css";

export interface InspectorOptions {
  tokens?: TokenSource;
}

export class VisualQAInspector extends HTMLElement {
  readonly store = new InspectorStore();
  readonly resolver = new TokenResolver();
  private picker!: Picker;
  private panelEl!: HTMLDivElement;
  private launchEl!: HTMLButtonElement;
  private drawerEl: HTMLDivElement | null = null;
  private drawerOpen = false;
  private perSide = new Set<string>(); // which spacing controls are expanded
  private colorPicker: ColorPicker | null = null;
  private varPopover: VarPopover | null = null;

  connectedCallback(): void {
    ensureFonts();
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
    // Move the launcher to the bottom-left when the panel is open so it never
    // overlaps the panel footer or the changes drawer (both bottom-right).
    if (this.store.selected) {
      this.launchEl.style.left = "20px";
      this.launchEl.style.right = "auto";
    } else {
      this.launchEl.style.left = "auto";
      this.launchEl.style.right = "20px";
    }
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
      if (group.group === "Layout") this.panelEl.append(this.layoutSection(sel, cs));
      else this.panelEl.append(this.section(sel, group, cs));
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
      f.append(Object.assign(el("span", "tok"), { textContent: prettyTok(bound) }));
    } else {
      const input = document.createElement("input");
      input.value = current || "";
      input.placeholder = "–";
      input.onchange = () => this.commit(elm, prop, input.value);
      f.append(input);
    }
    if (prop.family) {
      const dia = el("span", "diabtn");
      dia.textContent = "◇";
      dia.title = "Bind variable";
      dia.onclick = (e) => {
        e.stopPropagation();
        this.openVars(elm, prop, f, bound);
      };
      f.append(dia);
    }
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
    const nm = el("div", "nm");
    nm.textContent = bound ? prettyTok(bound) : toHex(current);
    f.style.cursor = "pointer";
    f.append(sw, nm);
    f.onclick = (e) => {
      if ((e.target as HTMLElement).closest(".dia")) return;
      this.openColor(elm, prop, f, current, "custom");
    };
    // ◇ opens the picker straight on the Variables tab
    const dia = el("span", "dia");
    dia.textContent = "◇";
    dia.title = "Bind variable";
    dia.onclick = (e) => {
      e.stopPropagation();
      this.openColor(elm, prop, f, current, "variables");
    };
    f.append(dia);
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
      f.classList.add("sel");
      f.style.cursor = "pointer";
      f.append(Object.assign(el("span", "selval"), { textContent: current }));
      f.append(Object.assign(el("span", "chev"), { textContent: "▾" }));
      f.onclick = (e) => {
        if ((e.target as HTMLElement).closest(".revert")) return;
        this.openSelect(elm, prop, f, current);
      };
    }
    if (modified) f.append(this.revert(elm, prop.css));
    return f;
  }

  // ---------- custom select dropdown ----------
  private selDrop: HTMLDivElement | null = null;
  private selAnchor: HTMLElement | null = null;

  private openSelect(elm: HTMLElement, prop: PropSchema, anchor: HTMLElement, current: string): void {
    this.closeSelect();
    const drop = el("div", "seldrop");
    for (const o of prop.options ?? []) {
      const it = el("div", "seldrop-it");
      it.textContent = o;
      if (o === current) it.classList.add("on");
      it.onclick = () => { this.store.setProp(elm, prop.css, o); this.closeSelect(); };
      drop.append(it);
    }
    (this.shadowRoot!.querySelector(".wrap") as HTMLElement).append(drop);
    const r = anchor.getBoundingClientRect();
    drop.style.left = r.left + "px";
    drop.style.width = r.width + "px";
    const dh = drop.offsetHeight;
    const below = r.bottom + 4;
    drop.style.top = (below + dh > window.innerHeight - 8 ? r.top - dh - 4 : below) + "px";
    this.selDrop = drop;
    this.selAnchor = anchor;
    setTimeout(() => document.addEventListener("pointerdown", this.onSelOutside, true));
  }

  private onSelOutside = (e: PointerEvent): void => {
    const path = e.composedPath();
    if (this.selDrop && !path.includes(this.selDrop) && !path.includes(this.selAnchor as HTMLElement)) this.closeSelect();
  };

  private closeSelect(): void {
    document.removeEventListener("pointerdown", this.onSelOutside, true);
    this.selDrop?.remove();
    this.selDrop = null;
    this.selAnchor = null;
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

  // ---------- Layout (custom, matches Figma 29:19) ----------
  private layoutSection(elm: HTMLElement, cs: CSSStyleDeclaration): HTMLElement {
    const sec = el("div", "sec");
    const head = el("div", "sech");
    head.append(Object.assign(el("span", "t"), { textContent: "Layout" }));
    const flat = ["display", "flex-direction", "flex-wrap", "gap", "width", "height", "min-width", "min-height", "max-width", "max-height", "overflow"];
    const modCount =
      flat.filter((p) => this.store.isModified(elm, p)).length +
      this.spacingModified(elm, "padding") +
      this.spacingModified(elm, "margin");
    if (modCount) head.append(Object.assign(el("span", "badge"), { textContent: String(modCount) }));
    sec.append(head);

    // Display
    sec.append(el("div", "lbl", "Display"));
    sec.append(this.segmented(elm, { css: "display", control: "segmented", options: ["block", "flex", "grid", "inline", "none"] }, cs));

    // Flow + Gap (only when flex/grid)
    if (["flex", "inline-flex", "grid", "inline-grid"].includes(cs.display)) {
      sec.append(el("div", "lbl", "Flow"));
      sec.append(this.flowRow(elm, cs));
      sec.append(wrapRow(this.lengthField(elm, { css: "gap", control: "length", label: "Gap", family: "space" }, cs)));
    }

    // Dimensions / Min / Max
    sec.append(el("div", "lbl", "Dimensions"));
    sec.append(pair(this.lengthField(elm, { css: "width", control: "length", label: "W" }, cs), this.lengthField(elm, { css: "height", control: "length", label: "H" }, cs)));
    sec.append(el("div", "lbl", "Min size"));
    sec.append(pair(this.lengthField(elm, { css: "min-width", control: "length", label: "W", family: "size" }, cs), this.lengthField(elm, { css: "min-height", control: "length", label: "H", family: "size" }, cs)));
    sec.append(el("div", "lbl", "Max size"));
    sec.append(pair(this.lengthField(elm, { css: "max-width", control: "length", label: "W", family: "size" }, cs), this.lengthField(elm, { css: "max-height", control: "length", label: "H", family: "size" }, cs)));

    // Overflow
    sec.append(el("div", "lbl", "Overflow"));
    sec.append(wrapRow(this.selectField(elm, { css: "overflow", control: "select", options: ["visible", "hidden", "scroll", "auto", "clip"] }, cs)));

    // Padding / Margin
    sec.append(this.spacingGroup(elm, "padding", cs));
    sec.append(this.spacingGroup(elm, "margin", cs));

    // Clip content
    const chk = el("label", "chk");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = ["hidden", "clip"].includes(cs.overflow);
    cb.onchange = () => this.store.setProp(elm, "overflow", cb.checked ? "hidden" : "visible");
    chk.append(cb, Object.assign(document.createElement("span"), { textContent: "Clip content" }));
    sec.append(chk);
    return sec;
  }

  private flowRow(elm: HTMLElement, cs: CSSStyleDeclaration): HTMLElement {
    const wrapEl = el("div", "flow");
    const dir = el("div", "dir");
    const dirs: Array<[string, string]> = [["row", "→"], ["column", "↓"], ["row-reverse", "←"], ["column-reverse", "↑"]];
    for (const [val, ic] of dirs) {
      const b = document.createElement("button");
      b.textContent = ic;
      if (cs.flexDirection === val) b.classList.add("on");
      b.onclick = () => this.store.setProp(elm, "flex-direction", val);
      dir.append(b);
    }
    const wbtn = document.createElement("button");
    wbtn.className = "wrapbtn";
    wbtn.textContent = "⤶";
    wbtn.title = "Wrap";
    if (cs.flexWrap === "wrap") wbtn.classList.add("on");
    wbtn.onclick = () => this.store.setProp(elm, "flex-wrap", cs.flexWrap === "wrap" ? "nowrap" : "wrap");
    wrapEl.append(dir, wbtn);
    return wrapEl;
  }

  private spacingModified(elm: HTMLElement, base: string): number {
    return ["top", "right", "bottom", "left"].filter((s) => this.store.isModified(elm, `${base}-${s}`)).length;
  }

  private spacingGroup(elm: HTMLElement, base: string, cs: CSSStyleDeclaration): HTMLElement {
    const wrapEl = document.createElement("div");
    wrapEl.append(el("div", "lbl", base[0].toUpperCase() + base.slice(1)));
    const expanded = this.perSide.has(base);
    const gear = () => {
      const g = el("span", "gear" + (expanded ? " on" : ""));
      g.textContent = "⊞";
      g.title = "Edit each side";
      g.onclick = () => {
        expanded ? this.perSide.delete(base) : this.perSide.add(base);
        this.render();
      };
      return g;
    };
    const side = (s: string, glyph: string) =>
      this.lengthField(elm, { css: `${base}-${s}`, control: "length", label: glyph, family: "space" }, cs);

    if (!expanded) {
      const row = el("div", "row with-gear");
      row.append(this.axisField(elm, base, "left", "right", "↔", cs), this.axisField(elm, base, "top", "bottom", "↕", cs), gear());
      wrapEl.append(row);
    } else {
      const r1 = el("div", "row with-gear");
      r1.append(side("top", "T"), side("right", "R"), gear());
      const r2 = el("div", "row");
      r2.append(side("bottom", "B"), side("left", "L"));
      wrapEl.append(r1, r2);
    }
    return wrapEl;
  }

  private axisField(elm: HTMLElement, base: string, a: string, b: string, glyph: string, cs: CSSStyleDeclaration): HTMLElement {
    const cssA = `${base}-${a}`;
    const cssB = `${base}-${b}`;
    const mod = this.store.isModified(elm, cssA) || this.store.isModified(elm, cssB);
    const f = el("div", "field");
    if (mod) f.classList.add("mod");
    f.append(Object.assign(el("span", "gl"), { textContent: glyph }));
    const input = document.createElement("input");
    input.value = cs.getPropertyValue(cssA).trim();
    input.placeholder = "–";
    input.onchange = () => this.commitMany(elm, [cssA, cssB], "space", input.value);
    f.append(input);
    if (mod) {
      const r = el("span", "revert");
      r.textContent = "↺";
      r.title = "Reset to original";
      r.onclick = () => {
        this.store.revertProp(elm, cssA);
        this.store.revertProp(elm, cssB);
      };
      f.append(r);
    }
    return f;
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

  // ---------- color picker ----------
  private openColor(elm: HTMLElement, prop: PropSchema, anchor: HTMLElement, current: string, tab: "custom" | "variables"): void {
    this.colorPicker?.close();
    this.colorPicker = new ColorPicker({
      mount: this.shadowRoot!.querySelector(".wrap") as HTMLElement,
      anchor,
      value: current,
      tab,
      tokens: this.resolver.allTokens("color"),
      onPick: (css) => this.store.setProp(elm, prop.css, css),
      onBind: (t) => this.bind(elm, prop.css, t.name),
      onClose: () => { this.colorPicker = null; },
    });
  }

  // ---------- variables popover ----------
  private openVars(elm: HTMLElement, prop: PropSchema, anchor: HTMLElement, bound: string | null): void {
    this.varPopover?.close();
    const current = bound ? bound.replace(/^var\(|\)$/g, "") : null;
    this.varPopover = new VarPopover({
      mount: this.shadowRoot!.querySelector(".wrap") as HTMLElement,
      anchor,
      tokens: this.resolver.allTokens(prop.family as TokenFamily),
      current,
      onBind: (t) => { this.bind(elm, prop.css, t.name); this.varPopover?.close(); },
      onDetach: () => { this.unbind(elm, prop.css); this.varPopover?.close(); },
      onClose: () => { this.varPopover = null; },
    });
  }

  // ---------- token helpers ----------

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
function pair(a: HTMLElement, b: HTMLElement): HTMLElement {
  const row = el("div", "row");
  row.append(a, b);
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

// Load Geist into the document head (not the Shadow DOM) — @font-face/@import
// inside a shadow root is unreliable, but document-level fonts resolve in it.
function ensureFonts(): void {
  if (document.getElementById("vqi-fonts")) return;
  const pre = document.createElement("link");
  pre.rel = "preconnect";
  pre.href = "https://fonts.gstatic.com";
  pre.crossOrigin = "anonymous";
  document.head.append(pre);
  const link = document.createElement("link");
  link.id = "vqi-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";
  document.head.append(link);
}

let defined = false;
export function defineInspector(): void {
  if (!defined && !customElements.get("visual-qa-inspector")) {
    customElements.define("visual-qa-inspector", VisualQAInspector);
    defined = true;
  }
}
