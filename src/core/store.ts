// Single source of truth for the inspector: current selection, tracked edits,
// and undo/redo. UI is a pure function of this store (pattern borrowed from
// DialKit's DialStore — a plain class with pub/sub).

import type { Edit, EditMap } from "./types";

type Listener = () => void;

interface HistoryEntry {
  el: HTMLElement;
  prop: string;
  prev: Edit | undefined;
  next: Edit | undefined;
}

export class InspectorStore {
  private selectedEl: HTMLElement | null = null;
  private edits = new Map<HTMLElement, EditMap>();
  private listeners = new Set<Listener>();
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  /** Currently selected element, or null. */
  get selected(): HTMLElement | null {
    return this.selectedEl;
  }

  select(el: HTMLElement | null): void {
    this.selectedEl = el;
    this.notify();
  }

  getEdits(el: HTMLElement): EditMap {
    return this.edits.get(el) ?? {};
  }

  /** All elements with at least one effective change. */
  allEdited(): Array<[HTMLElement, EditMap]> {
    const out: Array<[HTMLElement, EditMap]> = [];
    for (const [el, map] of this.edits) {
      if (Object.values(map).some((e) => e.from !== e.to)) out.push([el, map]);
    }
    return out;
  }

  /** Total count of effective changes across all elements. */
  changeCount(): number {
    let n = 0;
    for (const [, map] of this.edits) {
      n += Object.values(map).filter((e) => e.from !== e.to).length;
    }
    return n;
  }

  /**
   * Apply a change to one CSS property. Captures the original computed value
   * the first time a property is touched, writes inline style for preview,
   * and records the change for undo.
   */
  setProp(el: HTMLElement, prop: string, to: string, token?: string): void {
    const map = this.edits.get(el) ?? {};
    const prev = map[prop];
    const from = prop in map ? map[prop].from : getComputedStyle(el).getPropertyValue(prop).trim();
    const next: Edit = { from, to, token };

    map[prop] = next;
    this.edits.set(el, map);
    el.style.setProperty(prop, to);

    this.undoStack.push({ el, prop, prev, next });
    this.redoStack = [];
    this.notify();
  }

  setMany(el: HTMLElement, values: Record<string, string>): void {
    for (const [prop, to] of Object.entries(values)) this.setProp(el, prop, to);
  }

  /** Remove all edits for an element and restore inline styles. */
  reset(el: HTMLElement): void {
    const map = this.edits.get(el);
    if (!map) return;
    for (const prop of Object.keys(map)) el.style.removeProperty(prop);
    this.edits.delete(el);
    this.notify();
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.applyHistory(entry.el, entry.prop, entry.prev);
    this.redoStack.push(entry);
    this.notify();
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    this.applyHistory(entry.el, entry.prop, entry.next);
    this.undoStack.push(entry);
    this.notify();
  }

  private applyHistory(el: HTMLElement, prop: string, edit: Edit | undefined): void {
    const map = this.edits.get(el) ?? {};
    if (edit) {
      map[prop] = edit;
      el.style.setProperty(prop, edit.to);
    } else {
      delete map[prop];
      el.style.removeProperty(prop);
    }
    this.edits.set(el, map);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
