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
export type ControlKind = "length" | "color" | "select" | "text";

export interface PropSchema {
  /** CSS property name, e.g. "padding-top". */
  css: string;
  control: ControlKind;
  options?: string[];
  /** Token family to suggest for this property. */
  family?: TokenFamily;
  /** Display label; defaults to css. */
  label?: string;
}

export interface GroupSchema {
  group: string;
  props: PropSchema[];
}
