// Element picker: hover highlight + click to select + Esc to cancel.
// Ignores the tool's own nodes (the inspector host element).

import type { InspectorStore } from "./store";

export interface PickerOptions {
  /** Host element of the inspector UI, excluded from picking. */
  host: HTMLElement;
  /** Called when pick mode toggles, so the UI can reflect state. */
  onToggle?: (active: boolean) => void;
}

export class Picker {
  private active = false;
  private overlay: HTMLDivElement;
  private tip: HTMLSpanElement;

  constructor(private store: InspectorStore, private opts: PickerOptions) {
    this.overlay = document.createElement("div");
    this.overlay.className = "vqi-overlay";
    this.overlay.style.cssText =
      "position:fixed;pointer-events:none;z-index:2147483640;outline:1.5px solid #0d99ff;" +
      "background:rgba(13,153,255,.08);display:none;";
    this.tip = document.createElement("span");
    this.tip.style.cssText =
      "position:absolute;top:-19px;left:0;background:#0d99ff;color:#fff;font:600 10px system-ui;" +
      "padding:1px 6px;border-radius:3px;white-space:nowrap;";
    this.overlay.appendChild(this.tip);
    document.body.appendChild(this.overlay);

    document.addEventListener("mousemove", this.onMove, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("keydown", this.onKey, true);
  }

  get isActive(): boolean {
    return this.active;
  }

  toggle(on = !this.active): void {
    this.active = on;
    document.body.style.cursor = on ? "crosshair" : "";
    if (!on) this.overlay.style.display = "none";
    this.opts.onToggle?.(on);
  }

  private isToolNode(t: EventTarget | null): boolean {
    return t instanceof Node && (this.opts.host.contains(t) || this.overlay.contains(t as Node));
  }

  private onMove = (e: MouseEvent): void => {
    if (!this.active) return;
    const t = e.target as HTMLElement;
    if (this.isToolNode(t)) {
      this.overlay.style.display = "none";
      return;
    }
    const r = t.getBoundingClientRect();
    this.overlay.style.display = "block";
    this.overlay.style.left = r.left + "px";
    this.overlay.style.top = r.top + "px";
    this.overlay.style.width = r.width + "px";
    this.overlay.style.height = r.height + "px";
    const cls = [...t.classList][0];
    this.tip.textContent = t.tagName.toLowerCase() + (cls ? "." + cls : "");
  };

  private onClick = (e: MouseEvent): void => {
    if (!this.active) return;
    const t = e.target as HTMLElement;
    if (this.isToolNode(t)) return;
    e.preventDefault();
    e.stopPropagation();
    this.store.select(t);
    this.toggle(false);
  };

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.toggle(false);
  };

  destroy(): void {
    document.removeEventListener("mousemove", this.onMove, true);
    document.removeEventListener("click", this.onClick, true);
    document.removeEventListener("keydown", this.onKey, true);
    this.overlay.remove();
  }
}
