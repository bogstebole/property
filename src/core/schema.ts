// Panel data model — maps DOM/CSS to the web-QA section structure defined in
// SIDEBAR_SPEC.md §1–2. Section titles use the web-QA labels (Layout, Typography,
// Appearance, Background, Border, Effects). Conditional sections per §6.

import type { GroupSchema } from "./types";

const isPositioned = (_el: HTMLElement, cs: CSSStyleDeclaration): boolean =>
  ["absolute", "fixed", "sticky"].includes(cs.position);

const isFlexOrGrid = (_el: HTMLElement, cs: CSSStyleDeclaration): boolean =>
  ["flex", "inline-flex", "grid", "inline-grid"].includes(cs.display);

export function isTextElement(el: HTMLElement): boolean {
  return el.children.length === 0 && (el.textContent ?? "").trim().length > 0;
}

export const SCHEMA: GroupSchema[] = [
  {
    group: "Position",
    showIf: isPositioned,
    props: [
      { css: "position", control: "select", options: ["static", "relative", "absolute", "fixed", "sticky"] },
      { css: "top", control: "length", family: "space" },
      { css: "right", control: "length", family: "space" },
      { css: "bottom", control: "length", family: "space" },
      { css: "left", control: "length", family: "space" },
      { css: "z-index", control: "text", label: "z-index" },
    ],
  },
  {
    group: "Layout",
    props: [
      { css: "display", control: "segmented", options: ["block", "flex", "grid", "inline", "none"] },
      { css: "flex-direction", control: "segmented", options: ["row", "column", "row-reverse", "column-reverse"], showIf: isFlexOrGrid },
      { css: "align", control: "align-grid", showIf: isFlexOrGrid },
      { css: "gap", control: "length", family: "space", showIf: isFlexOrGrid },
      { css: "width", control: "length", label: "W" },
      { css: "height", control: "length", label: "H" },
      { css: "min-width", control: "length", family: "size", label: "min W" },
      { css: "min-height", control: "length", family: "size", label: "min H" },
      { css: "max-width", control: "length", family: "size", label: "max W" },
      { css: "max-height", control: "length", family: "size", label: "max H" },
      { css: "overflow", control: "select", options: ["visible", "hidden", "scroll", "auto", "clip"] },
      { css: "padding", control: "spacing", family: "space" },
      { css: "margin", control: "spacing", family: "space" },
    ],
  },
  {
    group: "Typography",
    showIf: (el) => isTextElement(el),
    props: [
      { css: "font-family", control: "select", options: [], label: "font" },
      { css: "font-size", control: "length", family: "size" },
      { css: "font-weight", control: "select", options: ["300", "400", "500", "600", "700", "800"] },
      { css: "line-height", control: "text", label: "LH" },
      { css: "letter-spacing", control: "text", label: "LS" },
      { css: "text-align", control: "segmented", options: ["left", "center", "right", "justify"] },
      { css: "color", control: "color", family: "color" },
      { css: "text-transform", control: "select", options: ["none", "uppercase", "lowercase", "capitalize"] },
      { css: "text-decoration-line", control: "select", options: ["none", "underline", "line-through", "overline"], label: "decoration" },
    ],
  },
  {
    group: "Appearance",
    props: [
      { css: "opacity", control: "text" },
      { css: "border-radius", control: "length", family: "radius" },
    ],
  },
  {
    group: "Background",
    addable: true,
    props: [{ css: "background-color", control: "color", family: "color" }],
  },
  {
    group: "Border",
    addable: true,
    props: [
      { css: "border-style", control: "select", options: ["none", "solid", "dashed", "dotted"] },
      { css: "border-width", control: "length" },
      { css: "border-color", control: "color", family: "color" },
    ],
  },
  {
    group: "Effects",
    addable: true,
    props: [{ css: "box-shadow", control: "text" }],
  },
];
