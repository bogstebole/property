import { describe, it, expect, beforeEach } from "vitest";
import { InspectorStore } from "../src/core/store";
import { buildPrompt } from "../src/core/prompt";

let store: InspectorStore;
let el: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = `<button class="btn btn-primary">Get started</button>`;
  el = document.querySelector("button")!;
  store = new InspectorStore();
});

describe("InspectorStore", () => {
  it("records from/to and applies inline style", () => {
    store.setProp(el, "padding", "16px");
    expect(el.style.padding).toBe("16px");
    expect(store.getEdits(el).padding.to).toBe("16px");
    expect(store.changeCount()).toBe(1);
  });

  it("undo and redo", () => {
    store.setProp(el, "padding", "16px");
    store.undo();
    expect(store.changeCount()).toBe(0);
    store.redo();
    expect(store.changeCount()).toBe(1);
  });

  it("reset clears edits and inline styles", () => {
    store.setProp(el, "padding", "16px");
    store.reset(el);
    expect(el.style.padding).toBe("");
    expect(store.changeCount()).toBe(0);
  });
});

describe("buildPrompt", () => {
  it("emits selector, context, and token-aware diff", () => {
    store.setProp(el, "background-color", "#8b5cf6", "var(--color-accent-2)");
    const out = buildPrompt(store);
    expect(out).toContain("Element: <button class=\"btn btn-primary\">");
    expect(out).toContain('// "Get started"');
    expect(out).toContain("Selector:");
    expect(out).toContain("background-color:");
    expect(out).toContain("→ var(--color-accent-2)");
  });

  it("returns placeholder when no effective change", () => {
    expect(buildPrompt(store)).toBe("No changes yet.");
  });
});
