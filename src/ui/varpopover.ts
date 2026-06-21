// Custom variables popover (no native <select>). Lists tokens of one family,
// searchable + grouped by collection, with a check on the current binding and a
// Detach action. Used by the ◇ on length/size fields. Matches SIDEBAR_SPEC.md
// §5 states `vars-full` / `vars-empty` / `detach-variable`.

import type { Token } from "../core/types";

export interface VarPopoverOptions {
  mount: HTMLElement;
  anchor: HTMLElement;
  tokens: Token[];
  /** Currently bound token name (for the ✓), if any. */
  current?: string | null;
  onBind: (token: Token) => void;
  onDetach: () => void;
  onClose: () => void;
}

export class VarPopover {
  private root: HTMLDivElement;

  constructor(private opts: VarPopoverOptions) {
    this.root = document.createElement("div");
    this.root.className = "cpick vpop";
    opts.mount.append(this.root);
    this.render();
    setTimeout(() => document.addEventListener("pointerdown", this.onOutside, true));
  }

  private onOutside = (e: PointerEvent): void => {
    if (!e.composedPath().includes(this.root)) this.close();
  };

  close(): void {
    document.removeEventListener("pointerdown", this.onOutside, true);
    this.root.remove();
    this.opts.onClose();
  }

  private position(): void {
    const r = this.opts.anchor.getBoundingClientRect();
    const h = this.root.offsetHeight || 280;
    this.root.style.top = Math.max(8, Math.min(r.top - 8, window.innerHeight - h - 8)) + "px";
  }

  private render(): void {
    this.root.innerHTML = "";

    const head = div("cp-head");
    head.append(textEl("span", "cp-title", "Variables"));
    const x = div("cp-x");
    x.textContent = "✕";
    x.onclick = () => this.close();
    head.append(x);
    this.root.append(head);

    const search = document.createElement("input");
    search.className = "cp-search";
    search.placeholder = "Search variables";
    const list = div("cp-vars");

    const build = (q: string) => {
      list.innerHTML = "";
      if (this.opts.current) {
        const detach = div("cp-detach");
        detach.textContent = "⤫  Detach variable";
        detach.onclick = () => this.opts.onDetach();
        list.append(detach);
      }
      const matched = this.opts.tokens.filter((t) => prettyName(t.name).toLowerCase().includes(q.toLowerCase()));
      const groups = groupByCollection(matched);
      for (const [coll, items] of groups) {
        list.append(textEl("div", "cp-vgroup", coll.toUpperCase()));
        for (const t of items) {
          const row = div("cp-vrow");
          const sw = div("cp-vsw");
          sw.style.background = t.value;
          row.append(sw, textEl("span", "cp-vname", prettyName(t.name)));
          if (this.opts.current === t.name) row.append(textEl("span", "cp-check", "✓"));
          row.onclick = () => this.opts.onBind(t);
          list.append(row);
        }
      }
      if (!matched.length) list.append(textEl("div", "cp-empty", "No variables"));
    };

    search.oninput = () => build(search.value);
    build("");
    this.root.append(search, list);
    this.position();
  }
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
