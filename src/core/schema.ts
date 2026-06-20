// Maps DOM/CSS properties into the Figma-like panel structure.
// The final visual is driven by the user's Figma design (F0); this is the
// data model behind it.

import type { GroupSchema } from "./types";

export const SCHEMA: GroupSchema[] = [
  {
    group: "Auto layout",
    props: [
      { css: "display", control: "select", options: ["block", "flex", "inline-flex", "grid", "inline-block", "none"] },
      { css: "flex-direction", control: "select", options: ["row", "column", "row-reverse", "column-reverse"] },
      { css: "justify-content", control: "select", options: ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"] },
      { css: "align-items", control: "select", options: ["stretch", "flex-start", "center", "flex-end", "baseline"] },
      { css: "gap", control: "length", family: "space" },
      { css: "padding-top", control: "length", family: "space", label: "padding-y" },
      { css: "padding-left", control: "length", family: "space", label: "padding-x" },
      { css: "width", control: "length" },
      { css: "height", control: "length" },
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
    group: "Fill",
    props: [{ css: "background-color", control: "color", family: "color" }],
  },
  {
    group: "Typography",
    props: [
      { css: "font-size", control: "length", family: "size" },
      { css: "font-weight", control: "select", options: ["300", "400", "500", "600", "700", "800"] },
      { css: "line-height", control: "text" },
      { css: "letter-spacing", control: "text" },
      { css: "text-align", control: "select", options: ["left", "center", "right", "justify"] },
      { css: "color", control: "color", family: "color" },
    ],
  },
  {
    group: "Stroke",
    props: [
      { css: "border-width", control: "length" },
      { css: "border-color", control: "color", family: "color" },
      { css: "border-style", control: "select", options: ["none", "solid", "dashed", "dotted"] },
    ],
  },
  {
    group: "Effects",
    props: [
      { css: "box-shadow", control: "text", family: "shadow" },
    ],
  },
];

/** Only show Typography for elements that directly contain text. */
export function isTextElement(el: HTMLElement): boolean {
  return el.children.length === 0 && (el.textContent ?? "").trim().length > 0;
}
