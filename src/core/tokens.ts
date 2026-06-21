// TokenResolver — the precision engine. For any edited value, returns the
// exact project token name if one exists. Layered sources, priority order:
//   1. Manifest (build plugin, DTCG)  2. Runtime CSS vars  3. Tailwind classes
//   4. Raw fallback (no token).

import type { Token, TokenFamily } from "./types";

const COLOR_HINTS = ["color", "bg", "background", "fill", "border", "text"];
const SPACE_HINTS = ["space", "spacing", "gap", "padding", "margin"];
const RADIUS_HINTS = ["radius", "rounded"];
const SHADOW_HINTS = ["shadow", "elevation"];
const SIZE_HINTS = ["size", "font"];

function familyOf(name: string): TokenFamily {
  const n = name.toLowerCase();
  if (COLOR_HINTS.some((h) => n.includes(h))) return "color";
  if (SPACE_HINTS.some((h) => n.includes(h))) return "space";
  if (RADIUS_HINTS.some((h) => n.includes(h))) return "radius";
  if (SHADOW_HINTS.some((h) => n.includes(h))) return "shadow";
  if (SIZE_HINTS.some((h) => n.includes(h))) return "size";
  return "other";
}

/** Normalize a color string to a canonical rgb(...) form for comparison. */
function normColor(v: string): string {
  const probe = document.createElement("div");
  probe.style.color = v;
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}

/** Flatten a DTCG-style nested manifest into flat tokens. */
function flattenDtcg(obj: Record<string, unknown>, prefix = ""): Token[] {
  const out: Token[] = [];
  for (const [key, raw] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (raw && typeof raw === "object" && "$value" in (raw as object)) {
      const value = String((raw as { $value: unknown }).$value);
      out.push({ name: path, value, family: familyOf(path) });
    } else if (raw && typeof raw === "object") {
      out.push(...flattenDtcg(raw as Record<string, unknown>, path));
    }
  }
  return out;
}

export interface TokenSource {
  /** DTCG nested object, or flat { name: value }. */
  manifest?: Record<string, unknown>;
  /** Explicit class -> token name map (e.g. Tailwind). */
  classMap?: Record<string, string>;
}

export class TokenResolver {
  private tokens: Token[] = [];
  private valueToToken = new Map<string, string>(); // canonicalValue -> name
  private classToToken = new Map<string, string>();

  /** Build all maps from available sources. Safe to call once on init. */
  init(source: TokenSource = {}): void {
    this.tokens = [];

    // 1. Manifest (window/script/explicit)
    const manifest = source.manifest ?? this.readInjectedManifest();
    if (manifest) this.tokens.push(...this.parseManifest(manifest));

    // 2. Runtime CSS variables
    this.tokens.push(...this.readCssVars());

    // 3. Tailwind / explicit class map
    if (source.classMap) {
      for (const [cls, name] of Object.entries(source.classMap)) this.classToToken.set(cls, name);
    }

    this.buildReverseMaps();
  }

  private readInjectedManifest(): Record<string, unknown> | null {
    const w = window as unknown as { __DESIGN_TOKENS__?: Record<string, unknown> };
    if (w.__DESIGN_TOKENS__) return w.__DESIGN_TOKENS__;
    const tag = document.getElementById("design-tokens");
    if (tag?.textContent) {
      try {
        return JSON.parse(tag.textContent);
      } catch {
        return null;
      }
    }
    return null;
  }

  private parseManifest(manifest: Record<string, unknown>): Token[] {
    // Detect DTCG (nested with $value) vs flat { name: value }.
    const looksDtcg = Object.values(manifest).some(
      (v) => v && typeof v === "object" && !Array.isArray(v)
    );
    if (looksDtcg) return flattenDtcg(manifest);
    return Object.entries(manifest).map(([name, value]) => ({
      name,
      value: String(value),
      family: familyOf(name),
    }));
  }

  private readCssVars(): Token[] {
    const out: Token[] = [];
    const rootCS = getComputedStyle(document.documentElement);
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | undefined;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        const styleRule = rule as CSSStyleRule;
        if (!styleRule.style || !styleRule.selectorText) continue;
        if (!/:root|html|^\*$/.test(styleRule.selectorText)) continue;
        for (let i = 0; i < styleRule.style.length; i++) {
          const prop = styleRule.style[i];
          if (!prop.startsWith("--")) continue;
          const value = rootCS.getPropertyValue(prop).trim();
          out.push({ name: prop, value, family: familyOf(prop) });
        }
      }
    }
    return out;
  }

  private buildReverseMaps(): void {
    // Key by family + value so the same value in two families (e.g. 16px as
    // --space-4 and --font-size-base) resolves to the family-correct token.
    for (const t of this.tokens) {
      const key = this.valueKey(t.value, t.family);
      if (!this.valueToToken.has(key)) this.valueToToken.set(key, t.name);
      if (t.className) this.classToToken.set(t.className, t.name);
    }
  }

  private valueKey(value: string, family: TokenFamily): string {
    return `${family}|${family === "color" ? normColor(value) : value.trim()}`;
  }

  /** Token name for a computed value, or null. */
  nameForValue(value: string, family: TokenFamily): string | null {
    return this.valueToToken.get(this.valueKey(value, family)) ?? null;
  }

  /** Token name for a class (Tailwind path), or null. */
  nameForClass(cls: string): string | null {
    return this.classToToken.get(cls) ?? null;
  }

  /** All tokens of a family — for dropdowns in the panel. */
  allTokens(family: TokenFamily): Token[] {
    return this.tokens.filter((t) => t.family === family);
  }

  /** Render a token name as a usable CSS reference. */
  asCssRef(name: string): string {
    return name.startsWith("--") ? `var(${name})` : name;
  }
}
