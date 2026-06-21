// Custom HSV color picker popover (no native <input type=color>). Renders into
// the panel's Shadow DOM, opens to the left of the panel. Two tabs: Custom
// (SV square + hue + alpha + hex + document colors) and Variables (token list).
// Matches SIDEBAR_SPEC.md §5 state `color-picker`.

import type { Token } from "../core/types";

export interface ColorPickerOptions {
  mount: HTMLElement; // shadow .wrap
  anchor: HTMLElement; // the swatch/field clicked, for vertical alignment
  value: string; // current CSS color
  tokens: Token[]; // color tokens (Variables tab + document colors)
  onPick: (css: string) => void; // a raw color was chosen
  onBind: (token: Token) => void; // a token was chosen
  onClose: () => void;
  tab?: "custom" | "variables"; // initial tab
}

interface RGBA { r: number; g: number; b: number; a: number; }

export class ColorPicker {
  private root: HTMLDivElement;
  private h = 0;
  private s = 0;
  private v = 0;
  private a = 1;
  private tab: "custom" | "variables" = "custom";

  constructor(private opts: ColorPickerOptions) {
    const { r, g, b, a } = parseColor(opts.value);
    [this.h, this.s, this.v] = rgbToHsv(r, g, b);
    this.a = a;
    this.tab = opts.tab ?? "custom";
    this.root = document.createElement("div");
    this.root.className = "cpick";
    opts.mount.append(this.root);
    this.render();
    setTimeout(() => document.addEventListener("pointerdown", this.onOutside, true));
  }

  private position(): void {
    const r = this.opts.anchor.getBoundingClientRect();
    const h = this.root.offsetHeight || 320;
    const top = Math.min(Math.max(8, r.top - 8), window.innerHeight - h - 8);
    this.root.style.top = Math.max(8, top) + "px";
  }

  private onOutside = (e: PointerEvent): void => {
    if (!e.composedPath().includes(this.root)) this.close();
  };

  close(): void {
    document.removeEventListener("pointerdown", this.onOutside, true);
    this.root.remove();
    this.opts.onClose();
  }

  // ---------- emit ----------
  private emit(): void {
    const [r, g, b] = hsvToRgb(this.h, this.s, this.v);
    const css = this.a < 1 ? `rgba(${r}, ${g}, ${b}, ${round(this.a, 2)})` : toHex(r, g, b);
    this.opts.onPick(css);
  }

  // ---------- render ----------
  private render(): void {
    this.root.innerHTML = "";
    const head = div("cp-head");
    head.append(textEl("span", "cp-title", "Solid"));
    const x = div("cp-x");
    x.textContent = "✕";
    x.onclick = () => this.close();
    head.append(x);
    this.root.append(head);

    const tabs = div("cp-tabs");
    (["custom", "variables"] as const).forEach((t) => {
      const b = document.createElement("button");
      b.textContent = t === "custom" ? "Custom" : "Variables";
      if (this.tab === t) b.className = "on";
      b.onclick = () => { this.tab = t; this.render(); };
      tabs.append(b);
    });
    this.root.append(tabs);

    if (this.tab === "custom") this.renderCustom();
    else this.renderVariables();
    this.position();
  }

  private renderCustom(): void {
    const [hr, hg, hb] = hsvToRgb(this.h, 100, 100);
    const hueColor = `rgb(${hr}, ${hg}, ${hb})`;

    // SV square
    const sv = div("cp-sv");
    sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`;
    const svThumb = div("cp-thumb");
    svThumb.style.left = this.s + "%";
    svThumb.style.top = 100 - this.v + "%";
    sv.append(svThumb);
    this.drag(sv, (px, py) => {
      this.s = clamp(px * 100);
      this.v = clamp((1 - py) * 100);
      svThumb.style.left = this.s + "%";
      svThumb.style.top = 100 - this.v + "%";
      this.emit();
      this.syncHexInput();
      this.updateSwatch();
    });
    this.root.append(sv);

    // hue + eyedropper row
    const row = div("cp-row");
    const eye = div("cp-eye");
    eye.textContent = "⊙";
    eye.title = "Pick from screen";
    eye.onclick = () => this.eyedrop();
    const hue = div("cp-hue");
    const hueThumb = div("cp-slthumb");
    hueThumb.style.left = (this.h / 360) * 100 + "%";
    hue.append(hueThumb);
    this.drag(hue, (px) => {
      this.h = clamp(px, 0, 1) * 360;
      hueThumb.style.left = px * 100 + "%";
      this.render(); // SV bg depends on hue
      this.emit();
    });
    row.append(eye, hue);
    this.root.append(row);

    // alpha
    const alpha = div("cp-alpha");
    const [ar, ag, ab] = hsvToRgb(this.h, this.s, this.v);
    alpha.style.setProperty("--c", `${ar}, ${ag}, ${ab}`);
    const aThumb = div("cp-slthumb");
    aThumb.style.left = this.a * 100 + "%";
    alpha.append(aThumb);
    this.drag(alpha, (px) => {
      this.a = clamp(px, 0, 1);
      aThumb.style.left = px * 100 + "%";
      this.emit();
      this.syncHexInput();
    });
    this.root.append(alpha);

    // hex + alpha inputs
    const foot = div("cp-foot");
    foot.append(textEl("span", "cp-fmt", "HEX"));
    const hex = document.createElement("input");
    hex.className = "cp-hex";
    const [r, g, b] = hsvToRgb(this.h, this.s, this.v);
    hex.value = toHex(r, g, b).replace("#", "");
    hex.onchange = () => {
      const c = parseColor("#" + hex.value.replace("#", ""));
      [this.h, this.s, this.v] = rgbToHsv(c.r, c.g, c.b);
      this.render();
      this.emit();
    };
    const ap = document.createElement("input");
    ap.className = "cp-ap";
    ap.value = Math.round(this.a * 100) + "%";
    ap.onchange = () => {
      this.a = clamp(parseFloat(ap.value) / 100, 0, 1);
      this.emit();
    };
    foot.append(hex, ap);
    this.root.append(foot);

    // document colors
    if (this.opts.tokens.length) {
      const docs = div("cp-docs");
      for (const t of this.opts.tokens.slice(0, 18)) {
        const sw = div("cp-docsw");
        sw.style.background = t.value;
        sw.title = t.name;
        sw.onclick = () => this.opts.onBind(t);
        docs.append(sw);
      }
      this.root.append(docs);
    }
  }

  private renderVariables(): void {
    const search = document.createElement("input");
    search.className = "cp-search";
    search.placeholder = "Search variables";
    const list = div("cp-vars");
    const build = (q: string) => {
      list.innerHTML = "";
      const groups = groupByCollection(this.opts.tokens.filter((t) => t.name.toLowerCase().includes(q.toLowerCase())));
      for (const [coll, items] of groups) {
        list.append(textEl("div", "cp-vgroup", coll.toUpperCase()));
        for (const t of items) {
          const r = div("cp-vrow");
          const sw = div("cp-vsw");
          sw.style.background = t.value;
          r.append(sw, textEl("span", "cp-vname", prettyName(t.name)));
          r.onclick = () => this.opts.onBind(t);
          list.append(r);
        }
      }
      if (!groups.length) list.append(textEl("div", "cp-empty", "No variables"));
    };
    search.oninput = () => build(search.value);
    build("");
    this.root.append(search, list);
  }

  // ---------- helpers ----------
  private updateSwatch(): void {
    /* swatch in the panel updates on next render via store; no-op here */
  }
  private syncHexInput(): void {
    const hex = this.root.querySelector(".cp-hex") as HTMLInputElement | null;
    if (hex) {
      const [r, g, b] = hsvToRgb(this.h, this.s, this.v);
      hex.value = toHex(r, g, b).replace("#", "");
    }
  }

  private async eyedrop(): Promise<void> {
    const ED = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!ED) return;
    try {
      const res = await new ED().open();
      const c = parseColor(res.sRGBHex);
      [this.h, this.s, this.v] = rgbToHsv(c.r, c.g, c.b);
      this.a = 1;
      this.render();
      this.emit();
    } catch {
      /* cancelled */
    }
  }

  private drag(elm: HTMLElement, fn: (px: number, py: number) => void): void {
    const move = (e: PointerEvent) => {
      const r = elm.getBoundingClientRect();
      fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1));
    };
    elm.addEventListener("pointerdown", (e) => {
      elm.setPointerCapture(e.pointerId);
      move(e);
      const up = () => {
        elm.removeEventListener("pointermove", move);
        elm.removeEventListener("pointerup", up);
      };
      elm.addEventListener("pointermove", move);
      elm.addEventListener("pointerup", up);
    });
  }
}

// ---------- color math ----------
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? (d / max) * 100 : 0, max * 100];
}
function parseColor(str: string): RGBA {
  const d = document.createElement("div");
  d.style.color = str;
  document.body.appendChild(d);
  const c = getComputedStyle(d).color;
  d.remove();
  const m = c.match(/[\d.]+/g) ?? ["0", "0", "0"];
  return { r: +m[0], g: +m[1], b: +m[2], a: m[3] !== undefined ? +m[3] : 1 };
}
function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
function clamp(n: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, n));
}
function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
function prettyName(name: string): string {
  return name.replace(/^--/, "").replace(/\./g, "/").replace("-", "/");
}
function groupByCollection(tokens: Token[]): Array<[string, Token[]]> {
  const map = new Map<string, Token[]>();
  for (const t of tokens) {
    const coll = prettyName(t.name).split("/")[0];
    if (!map.has(coll)) map.set(coll, []);
    map.get(coll)!.push(t);
  }
  return [...map.entries()];
}

// ---------- tiny dom helpers ----------
function div(cls: string): HTMLDivElement {
  const n = document.createElement("div");
  n.className = cls;
  return n;
}
function textEl(tag: string, cls: string, text: string): HTMLElement {
  const n = document.createElement(tag);
  n.className = cls;
  n.textContent = text;
  return n;
}
