# ARCHITECTURE.md — Technical reference

Read `CLAUDE.md` for vision and locked decisions. This file is the technical detail an agent
needs to implement without deviating.

## Data flow

```
 ┌──────────────┐    select    ┌──────────────┐   read    ┌───────────────┐
 │   Picker     │ ───────────▶ │    Store     │ ◀──────── │ getComputedStyle│
 │ hover/click  │              │ selection +  │           │  + classList    │
 └──────────────┘              │ edit diff    │           └───────────────┘
                               └──────┬───────┘
              apply inline style      │  subscribe
                 (preview only)       ▼
                               ┌──────────────┐   resolve   ┌───────────────┐
                               │  UI Panel    │ ──────────▶ │ TokenResolver │
                               │ (Web Comp.)  │             │ value→token   │
                               └──────┬───────┘             └───────────────┘
                                      │ Copy config
                                      ▼
                               ┌──────────────┐
                               │ Prompt builder│ → handoff spec (clipboard)
                               └──────────────┘
```

The Store is the single source of truth (pattern borrowed from DialKit's `DialStore`: a plain
class with a Map of state + pub/sub listeners; UI is a pure function of the Store). This gives
undo/redo, multi-element edits, and presets for free.

## TokenResolver (the precision engine)

Goal: for any edited property, return the **exact token name** from the project if one exists.

Layered sources, checked in priority order:

1. **Manifest** (most accurate) — `window.__DESIGN_TOKENS__` or `<script id="design-tokens">`,
   emitted by the build plugin in DTCG format. Has canonical names regardless of Tailwind/SCSS.
2. **Runtime CSS variables** — parse `:root` custom properties via stylesheets + `getComputedStyle`.
   Works with zero setup when the project uses CSS vars.
3. **Tailwind class names** — read the element's `classList` (`p-4`, `bg-surface-2`). The class IS
   the token name; map it via the resolved Tailwind theme. Recovers names that runtime CSS lost.
4. **Raw fallback** — no token found. Return the raw value, flagged as non-token in the UI.

Internal maps:
- `valueToToken: Map<resolvedValue, tokenName>` — e.g. `"16px" → "space.4"`, `rgb(...) → color.accent`.
  Colors normalized to a canonical form before lookup.
- `classToToken: Map<className, tokenName>` — for the Tailwind path.

API sketch:
```ts
resolver.nameForValue(value: string, family: 'color'|'space'|'radius'|'size'): string | null
resolver.nameForClass(cls: string): string | null
resolver.allTokens(family): { name: string; value: string }[]   // for dropdowns
```

## Token build plugin (Vite)

Runs at build/dev. Produces the manifest:
- **Tailwind:** `resolveConfig(require('tailwind.config'))` → full theme object → flatten to tokens.
- **CSS vars:** parse project CSS for `:root { --* }`.
- **JS theme:** import the theme module, serialize.
Output: DTCG JSON, injected into the HTML as a `<script type="application/json">` tag.

DTCG (W3C Design Tokens Community Group) chosen because it interops with Style Dictionary,
Tokens Studio, and Figma variables — one format covers all token pipelines.

## Selector generation (for the prompt)

Priority: `#id` → unique class combos → `tag.class:nth-of-type(n)` path up to a stable ancestor.
The selector is for **human/agent context**, not guaranteed-unique runtime querying. Always pair
it with element context (tag, classes, text snippet) in the prompt.

## Prompt format (Copy config output)

```
Apply the following visual changes to the project. Use the existing design tokens shown as
`var(--token)` / `token.name` — do not hardcode raw values where a token is given. Keep every
other style untouched.

Element: <button class="btn btn-primary">  // "Get started"
Selector: .actions > button.btn.btn-primary
Changes:
  - padding: 12px 24px → space.4 space.6
  - background-color: #6d5efc → color.accent-2

Write the changes in the project's existing styling system (CSS/Tailwind/styled-components).
```

## Panel (UI)

- **Web Component + Shadow DOM** so host CSS and tool CSS never collide.
- Sections map DOM → a Figma-like mental model: Auto layout (display/flex/gap/padding/size),
  Appearance (opacity/radius), Fill (background, shows token name), Typography (text elements),
  Stroke (border), Effects (shadow).
- Final visual spec comes from the user's Figma design (F0). Do not finalize UI before that.

## Production safety

Inspector and manifest injection are gated behind a dev/staging flag (e.g. `import.meta.env.DEV`).
Nothing ships to production.
