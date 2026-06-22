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
import { FONT_FACE_CSS } from "./fonts";

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
  private bgTab: "color" | "gradient" | "image" = "color";

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
    const body = el("div", "panel-body");
    body.append(this.header(sel));

    for (const group of SCHEMA) {
      if (group.showIf && !group.showIf(sel, cs)) continue;
      if (group.group === "Layout") body.append(this.layoutSection(sel, cs));
      else if (group.group === "Appearance") body.append(this.appearanceSection(sel, cs));
      else if (group.group === "Background") body.append(this.backgroundSection(sel, cs));
      else if (group.group === "Border") body.append(this.borderSection(sel, cs));
      else body.append(this.section(sel, group, cs));
    }

    this.panelEl.append(body, this.footer(sel));
  }

  // ---------- header ----------
  private header(elm: HTMLElement): HTMLElement {
    const { tag, classes } = elementContext(elm);
    const box = el("div", "ident");

    const top = el("div", "ident-top");
    const tagline = el("div", "tagline");
    tagline.innerHTML = `&lt;${tag}&gt; ` + classes.map((c) => `<span class="cls">.${c}</span>`).join(" ");
    const pick = el("span", "pickbtn");
    pick.title = "Select another element";
    pick.innerHTML =
      '<svg width=13 height=13 viewBox="0 0 14 14" fill="none"><circle cx=7 cy=7 r=4 stroke="currentColor" stroke-width="1.3"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
    pick.onclick = () => this.picker.toggle(true);
    top.append(tagline, pick);
    box.append(top);

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

    const lab = prop.label ?? prop.css;
    if (lab !== "") f.append(Object.assign(el("span", "gl"), { textContent: lab }));

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
    const lab = prop.label ?? prop.css;
    if (lab !== "") f.append(Object.assign(el("span", "gl"), { textContent: lab }));

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
    sec.append(pair(this.dimField(elm, "width", "W"), this.dimField(elm, "height", "H")));
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

  // Dimension field: show the rendered box size when computed width/height is
  // "auto" (inline elements), so a real size always shows — like Figma.
  private dimField(elm: HTMLElement, css: "width" | "height", label: string): HTMLElement {
    const modified = this.store.isModified(elm, css);
    const f = el("div", "field" + (modified ? " mod" : ""));
    f.append(Object.assign(el("span", "gl"), { textContent: label }));
    const computed = getComputedStyle(elm).getPropertyValue(css).trim();
    const rect = elm.getBoundingClientRect();
    const rendered = Math.round((css === "width" ? rect.width : rect.height) * 100) / 100;
    const input = document.createElement("input");
    input.value = /^[\d.]+px$/.test(computed) ? computed : rendered + "px";
    input.onchange = () => this.store.setProp(elm, css, input.value);
    f.append(input);
    if (modified) f.append(this.revert(elm, css));
    return f;
  }

  // ---------- Appearance (Opacity | Corner radius, labels above) ----------
  private appearanceSection(elm: HTMLElement, cs: CSSStyleDeclaration): HTMLElement {
    const sec = el("div", "sec");
    const mod = ["opacity", "border-radius"].filter((p) => this.store.isModified(elm, p)).length;
    sec.append(this.sechEl("Appearance", mod));
    const row = el("div", "row");
    const c1 = el("div", "apcol");
    c1.append(this.lblDot("Opacity", this.store.isModified(elm, "opacity")), this.opacityField(elm, cs));
    const c2 = el("div", "apcol");
    c2.append(this.lblDot("Corner radius", this.store.isModified(elm, "border-radius")), this.lengthField(elm, { css: "border-radius", control: "length", label: "", family: "radius" }, cs));
    row.append(c1, c2);
    sec.append(row);
    return sec;
  }

  private opacityField(elm: HTMLElement, cs: CSSStyleDeclaration): HTMLElement {
    const modified = this.store.isModified(elm, "opacity");
    const f = el("div", "field" + (modified ? " mod" : ""));
    const input = document.createElement("input");
    input.value = Math.round(parseFloat(cs.opacity) * 100) + "%";
    input.onchange = () => {
      const n = parseFloat(input.value);
      this.store.setProp(elm, "opacity", String(isNaN(n) ? 1 : Math.min(100, Math.max(0, n)) / 100));
    };
    f.append(input);
    if (modified) f.append(this.revert(elm, "opacity"));
    return f;
  }

  // ---------- Background (Color / Gradient / Image tabs) ----------
  private backgroundSection(elm: HTMLElement, cs: CSSStyleDeclaration): HTMLElement {
    const sec = el("div", "sec");
    const mod = ["background-color", "background-image"].filter((p) => this.store.isModified(elm, p)).length;
    sec.append(this.sechEl("Background", mod, true));
    const tabs = el("div", "bgtabs");
    (["color", "gradient", "image"] as const).forEach((t) => {
      const b = document.createElement("button");
      b.textContent = t[0].toUpperCase() + t.slice(1);
      if (this.bgTab === t) b.className = "on";
      b.onclick = () => { this.bgTab = t; this.render(); };
      tabs.append(b);
    });
    sec.append(tabs);

    if (this.bgTab === "color") {
      sec.append(this.paintRow(elm, "background-color", { eye: true }));
    } else if (this.bgTab === "gradient") {
      sec.append(this.gradientEditor(elm));
    } else {
      sec.append(this.imageEditor(elm, cs));
    }
    return sec;
  }

  private gradientEditor(elm: HTMLElement): HTMLElement {
    const g = readGrad(elm);
    const wrap = document.createElement("div");
    const seg = el("div", "seg");
    for (const t of ["linear", "radial"] as const) {
      const b = document.createElement("button");
      b.textContent = t;
      if (g.type === t) b.classList.add("on");
      b.onclick = () => { g.type = t; this.writeGrad(elm, g); };
      seg.append(b);
    }
    const segRow = el("div", "row one");
    segRow.append(seg);
    wrap.append(segRow);
    if (g.type === "linear") {
      const f = el("div", "field");
      f.append(Object.assign(el("span", "gl"), { textContent: "∠" }));
      const i = document.createElement("input");
      i.value = g.angle;
      i.onchange = () => { g.angle = i.value; this.writeGrad(elm, g); };
      f.append(i);
      wrap.append(wrapRow(f));
    }
    g.stops.forEach((stop, idx) => {
      const f = el("div", "fill");
      f.style.cursor = "pointer";
      const sw = el("div", "sw");
      sw.style.background = stop;
      f.append(sw, Object.assign(el("div", "nm"), { textContent: stop }));
      f.onclick = () =>
        this.openColorAt(f, stop, "custom",
          (css) => { g.stops[idx] = css; this.writeGrad(elm, g); },
          (t) => { g.stops[idx] = t.name.startsWith("--") ? `var(${t.name})` : t.value; this.writeGrad(elm, g); });
      wrap.append(f);
    });
    return wrap;
  }

  private writeGrad(elm: HTMLElement, g: Grad): void {
    elm.dataset.vqiGrad = JSON.stringify(g);
    const grad = g.type === "linear"
      ? `linear-gradient(${g.angle}, ${g.stops[0]}, ${g.stops[1]})`
      : `radial-gradient(circle, ${g.stops[0]}, ${g.stops[1]})`;
    this.store.setProp(elm, "background-image", grad);
    this.render();
  }

  private imageEditor(elm: HTMLElement, cs: CSSStyleDeclaration): HTMLElement {
    const wrap = document.createElement("div");
    const uf = el("div", "field");
    uf.append(Object.assign(el("span", "gl"), { textContent: "URL" }));
    const i = document.createElement("input");
    const cur = cs.backgroundImage;
    i.value = cur && cur !== "none" ? cur.replace(/^url\(["']?|["']?\)$/g, "") : "";
    i.placeholder = "https://…";
    i.onchange = () => this.store.setProp(elm, "background-image", i.value ? `url("${i.value}")` : "none");
    uf.append(i);
    wrap.append(wrapRow(uf));
    wrap.append(el("div", "lbl", "Size"));
    wrap.append(wrapRow(this.selectField(elm, { css: "background-size", control: "select", options: ["auto", "cover", "contain"] }, cs)));
    wrap.append(el("div", "lbl", "Position"));
    wrap.append(wrapRow(this.selectField(elm, { css: "background-position", control: "select", options: ["center", "top", "bottom", "left", "right"] }, cs)));
    wrap.append(el("div", "lbl", "Repeat"));
    wrap.append(wrapRow(this.selectField(elm, { css: "background-repeat", control: "select", options: ["no-repeat", "repeat", "repeat-x", "repeat-y"] }, cs)));
    return wrap;
  }

  // ---------- Border (color row + style/width/gear) ----------
  private borderSection(elm: HTMLElement, cs: CSSStyleDeclaration): HTMLElement {
    const sec = el("div", "sec");
    const mod = ["border-color", "border-style", "border-width", "border-top-width"].filter((p) => this.store.isModified(elm, p)).length;
    sec.append(this.sechEl("Border", mod, true, () => { this.store.setMany(elm, { "border-style": "solid", "border-width": "1px" }); this.render(); }));

    const hasBorder = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none";
    if (!hasBorder) {
      sec.append(Object.assign(el("div", "addrow"), { textContent: "No border — click + to add" }));
      return sec;
    }

    sec.append(this.paintRow(elm, "border-color", {
      eye: true,
      minus: true,
      onRemove: () => { this.store.setMany(elm, { "border-style": "none", "border-width": "0px" }); this.render(); },
    }));

    const expanded = this.perSide.has("border");
    const row = el("div", "row with-gear");
    row.append(this.selectField(elm, { css: "border-style", control: "select", options: ["none", "solid", "dashed", "dotted"], label: "" }, cs));
    row.append(this.lengthField(elm, { css: "border-width", control: "length", label: "≡" }, cs));
    const gear = el("span", "gear" + (expanded ? " on" : ""));
    gear.textContent = "⊞";
    gear.title = "Edit each side";
    gear.onclick = () => { expanded ? this.perSide.delete("border") : this.perSide.add("border"); this.render(); };
    row.append(gear);
    sec.append(row);

    if (expanded) {
      const r1 = el("div", "row");
      r1.append(this.lengthField(elm, { css: "border-top-width", control: "length", label: "T" }, cs), this.lengthField(elm, { css: "border-right-width", control: "length", label: "R" }, cs));
      const r2 = el("div", "row");
      r2.append(this.lengthField(elm, { css: "border-bottom-width", control: "length", label: "B" }, cs), this.lengthField(elm, { css: "border-left-width", control: "length", label: "L" }, cs));
      sec.append(r1, r2);
    }
    return sec;
  }

  // ---------- a paint row (swatch + token + ◇ + eye/minus) ----------
  private paintRow(elm: HTMLElement, css: string, opts: { eye?: boolean; minus?: boolean; onRemove?: () => void }): HTMLElement {
    const prop: PropSchema = { css, control: "color", family: "color" };
    const cs = getComputedStyle(elm);
    const current = cs.getPropertyValue(css).trim();
    const modified = this.store.isModified(elm, css);
    const bound = this.boundToken(elm, prop, current);
    const f = el("div", "fill");
    if (modified) f.classList.add("mod");
    if (bound) f.classList.add("bound");
    f.style.cursor = "pointer";
    const sw = el("div", "sw");
    sw.style.background = current;
    f.append(sw, Object.assign(el("div", "nm"), { textContent: bound ? prettyTok(bound) : toHex(current) }));
    f.onclick = (e) => {
      if ((e.target as HTMLElement).closest(".dia,.eye,.minus")) return;
      this.openColor(elm, prop, f, current, "custom");
    };
    const dia = el("span", "dia");
    dia.textContent = "◇";
    dia.onclick = (e) => { e.stopPropagation(); this.openColor(elm, prop, f, current, "variables"); };
    f.append(dia);
    if (opts.eye) {
      const eye = el("span", "eye");
      eye.innerHTML = EYE_SVG;
      eye.title = "Toggle visibility";
      eye.onclick = (e) => {
        e.stopPropagation();
        const v = cs.getPropertyValue(css).trim();
        if (/rgba?\(0, 0, 0, 0\)|transparent/.test(v) && modified) this.store.revertProp(elm, css);
        else this.store.setProp(elm, css, "transparent");
      };
      f.append(eye);
    }
    if (opts.minus) {
      const m = el("span", "minus");
      m.innerHTML = MINUS_SVG;
      m.title = "Remove";
      m.onclick = (e) => { e.stopPropagation(); opts.onRemove?.(); };
      f.append(m);
    }
    if (modified) f.append(this.revert(elm, css));
    return f;
  }

  // section header helper
  private sechEl(title: string, modCount: number, addable = false, onAdd?: () => void): HTMLElement {
    const head = el("div", "sech");
    head.append(Object.assign(el("span", "t"), { textContent: title }));
    if (modCount) head.append(Object.assign(el("span", "badge"), { textContent: String(modCount) }));
    if (addable) {
      const a = el("span", "add");
      a.textContent = "+";
      if (onAdd) a.onclick = onAdd;
      head.append(a);
    }
    return head;
  }

  private lblDot(text: string, mod: boolean): HTMLElement {
    return Object.assign(el("div", "lbl" + (mod ? " moddot" : "")), { textContent: text });
  }

  // ---------- footer ----------
  private footer(elm: HTMLElement): HTMLElement {
    const foot = el("div", "foot");
    const n = this.store.changeCount();

    // "N changes" row (above the buttons; click opens the drawer)
    const count = el("div", "count" + (n ? "" : " zero"));
    count.append(Object.assign(el("span", "count-txt"), { textContent: `${n} change${n === 1 ? "" : "s"}` }));
    if (n) {
      const chev = el("span", "count-chev");
      chev.textContent = this.drawerOpen ? "⌃" : "⌄";
      count.append(chev);
      count.onclick = () => { this.drawerOpen = !this.drawerOpen; this.render(); };
    }
    foot.append(count);

    // Reset + Copy, inline
    const btns = el("div", "foot-btns");
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
    btns.append(rs, cp);
    foot.append(btns);
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
    this.openColorAt(anchor, current, tab,
      (css) => this.store.setProp(elm, prop.css, css),
      (t) => this.bind(elm, prop.css, t.name));
  }

  private openColorAt(anchor: HTMLElement, current: string, tab: "custom" | "variables", onPick: (css: string) => void, onBind: (t: import("../core/types").Token) => void): void {
    this.colorPicker?.close();
    this.colorPicker = new ColorPicker({
      mount: this.shadowRoot!.querySelector(".wrap") as HTMLElement,
      anchor,
      value: current,
      tab,
      tokens: this.resolver.allTokens("color"),
      onPick,
      onBind,
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
interface Grad { type: "linear" | "radial"; angle: string; stops: string[]; }
function readGrad(elm: HTMLElement): Grad {
  try {
    const g = JSON.parse(elm.dataset.vqiGrad ?? "");
    if (g && Array.isArray(g.stops)) return g;
  } catch {
    /* none yet */
  }
  return { type: "linear", angle: "90deg", stops: ["#6d5efc", "#8b5cf6"] };
}
const EYE_SVG =
  '<svg width=13 height=13 viewBox="0 0 14 14" fill="none"><path d="M1 7s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4z" stroke="currentColor" stroke-width="1.1"/><circle cx=7 cy=7 r=1.6 stroke="currentColor" stroke-width="1.1"/></svg>';
const MINUS_SVG =
  '<svg width=13 height=13 viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

function prettyTok(name: string): string {
  return name.replace(/^var\(|\)$/g, "").replace(/^--/, "").replace(/\./g, "/").replace("-", "/");
}
function toHex(v: string): string {
  const m = v.match(/\d+/g);
  if (!m) return "#000000";
  return "#" + m.slice(0, 3).map((x) => Number(x).toString(16).padStart(2, "0")).join("");
}

// Inject the self-hosted Geist @font-face into document.head. Document-level
// fonts resolve inside the Shadow DOM (shadow-scoped @font-face does not), and
// the font is embedded (base64) so the panel always uses its own font with no
// network/CDN/CSP dependency, regardless of what the host page uses.
function ensureFonts(): void {
  if (document.getElementById("vqi-fonts")) return;
  const style = document.createElement("style");
  style.id = "vqi-fonts";
  style.textContent = FONT_FACE_CSS;
  document.head.append(style);
}

let defined = false;
export function defineInspector(): void {
  if (!defined && !customElements.get("visual-qa-inspector")) {
    customElements.define("visual-qa-inspector", VisualQAInspector);
    defined = true;
  }
}
