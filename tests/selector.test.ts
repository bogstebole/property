import { describe, it, expect, beforeEach } from "vitest";
import { buildSelector, elementContext } from "../src/core/selector";

describe("buildSelector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("prefers id", () => {
    document.body.innerHTML = `<div id="hero"><button class="btn">Go</button></div>`;
    const btn = document.querySelector("button")!;
    expect(buildSelector(btn)).toContain("#hero");
  });

  it("builds a class + nth-of-type path", () => {
    document.body.innerHTML = `<div class="actions"><button class="btn">A</button><button class="btn">B</button></div>`;
    const second = document.querySelectorAll("button")[1] as HTMLElement;
    const sel = buildSelector(second);
    expect(sel).toContain("button.btn:nth-of-type(2)");
    expect(sel).toContain(".actions");
  });

  it("ignores tool classes", () => {
    document.body.innerHTML = `<button class="btn vqi-foo">X</button>`;
    expect(buildSelector(document.querySelector("button")!)).not.toContain("vqi-foo");
  });
});

describe("elementContext", () => {
  it("extracts tag, classes, trimmed text", () => {
    document.body.innerHTML = `<button class="btn primary">  Get   started  </button>`;
    const ctx = elementContext(document.querySelector("button")!);
    expect(ctx.tag).toBe("button");
    expect(ctx.classes).toEqual(["btn", "primary"]);
    expect(ctx.text).toBe("Get started");
  });
});
