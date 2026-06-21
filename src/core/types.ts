// Shared types for the inspector core.

export type TokenFamily = "color" | "space" | "radius" | "size" | "shadow" | "other";

export interface Token {
  /** Canonical token name, e.g. "color.accent" or "--color-accent". */
  name: string;
  /** Resolved value, e.g. "#6d5efc" or "16px". */
  value: string;
  family: TokenFamily;
  /** Optional Tailwind class that maps to this token, e.g. "bg-surface-2". */
  className?: string;
}

/** A single tracked edit on one CSS property. */
export interface Edit {
  from: string;
  to: string;
  /** Token name applied, if the new value resolved to a token. */
  token?: string;
}

/** All edits for one element, keyed by CSS property. */
export type EditMap = Record<string, Edit>;

/** Control kinds the panel can render for a property. */
export type ControlKind =
  | "length" // number + unit, bindable
  | "color" // swatch + value, bindable
  | "select" // dropdown
  | "segmented" // inline button group
  | "checkbox" // boolean toggle
  | "align-grid" // 3x3 justify x align
  | "spacing" // padding/margin: x/y pair + per-side toggle
  | "text"; // free value (line-height, opacity, shadow…)

export interface PropSchema {
  /** CSS property name, e.g. "padding-top". For "spacing" the base, e.g. "padding". */
  css: string;
  control: ControlKind;
  options?: string[];
  /** Token family to suggest for this property. */
  family?: TokenFamily;
  /** Display label; defaults to css. */
  label?: string;
  /** Optional condition gating visibility of this single prop. */
  showIf?: (el: HTMLElement, cs: CSSStyleDeclaration) => boolean;
}

export interface GroupSchema {
  /** Rendered section title (web-QA label: Layout, Typography, …). */
  group: string;
  props: PropSchema[];
  /** Optional condition gating the whole section. */
  showIf?: (el: HTMLElement, cs: CSSStyleDeclaration) => boolean;
  /** Header shows a `+` affordance (Background/Border/Effects). */
  addable?: boolean;
}
