# SIDEBAR_SPEC.md — Property panel behavior (F0)

> Read `CLAUDE.md` (vision + locked decisions) and `ARCHITECTURE.md` (data flow, TokenResolver,
> prompt format) first. This file is the **behavior contract for the right‑hand property panel** —
> every section, every control, every state. It is the spec an agent implements in **F4** (the
> Web Component panel) and the reference for keeping the Figma design and the code in sync.
>
> **Design source of truth:** Figma file `Property` → page `Sidebar` → frame `00 · Base sidebar (Web-QA)`
> (`node-id 3:2`, file `qcOidmIJbNPyobSK2wl9Ph`). The state mocks were prototyped in Paper
> (`Probarty` / page `Sidebar`).

---

## 0. Mental model (do not drift)

This is a **web visual‑QA tool**, not a Figma editor. The reviewer selects a **live DOM element**,
edits its parameters through this panel, and the only output is a **handoff prompt** (`Copy config`).
The panel never writes source; edits apply as inline styles for **preview only** (see `ARCHITECTURE.md`).

Two rules drive every decision below:

1. **DOM semantics, not canvas semantics.** Anything that only makes sense for objects on a Figma
   canvas (multi‑object alignment, X/Y canvas coordinates, layout guides, export) is **removed**.
   Sections map to real CSS (`display`, `padding`, `font-size`, `background`, `border`, …).
2. **Tokens over raw values, always.** Every numeric/color value tries to resolve to the project's
   real token via `TokenResolver`. A bound value renders as a **variable chip** (◇ + token name),
   never a hardcoded number. Raw values are the labeled fallback.

---

## 1. Anatomy (top → bottom)

| # | Section | Always shown? | Maps to |
|---|---------|---------------|---------|
| 1 | **Element identity** (header) | yes (when an element is selected) | `tag`, `classList`, DOM path, generated selector |
| 2 | **Position** | **only if** `position` ∈ {absolute, fixed, sticky} | `top/right/bottom/left`, `z-index` |
| 3 | **Layout** | yes | `display`, flex flow, `width/height`, min/max, `overflow`, `padding`, `margin` |
| 4 | **Typography** | **only if** element directly contains text (`isTextElement`) | font + text props |
| 5 | **Appearance** | yes | `opacity`, `border-radius` |
| 6 | **Background** | yes | `background` (color / gradient / image) |
| 7 | **Border** | yes | `border-width/color/style` (per‑side) |
| 8 | **Effects** | yes | `box-shadow`, filters |
| 9 | **Footer** (sticky) | yes | change count · `Reset` · `Copy config` |

Sections 2 and 4 are **conditional** (see §6). Removed vs. the old Figma clone: *Alignment row,
canvas X/Y, Layout guide, Export, Prototype tab, Selection colors* — none map to a single DOM node.

---

## 2. Sections — controls & behavior

### 2.1 Element identity (header)
- **Tag + classes** — `<button> .btn .btn-primary` (monospace). Tag white; classes accent‑blue.
- **Breadcrumb** — `body / main / form / button`, last segment = current element. Clicking a
  segment **selects that ancestor** (drives the Store's selection). A trailing `↑ parent` shortcut
  selects the immediate parent.
- **Selector** — the generated CSS selector (monospace, muted, e.g. `button.btn.btn-primary`).
  This is the same selector that goes into the prompt (`selector.ts`). Read‑only; click to copy.
- *Behavior:* updates live whenever the Store selection changes. With **no selection** this whole
  header is replaced by the No‑selection (Page) view (§5, state `no-selection`).

### 2.2 Position *(conditional)*
- Shown only when computed `position` is `absolute | fixed | sticky`. In normal flow the section is
  **hidden** (not greyed — absent), because top/left/right/bottom do nothing there.
- Controls: `position` dropdown, then **T / R / B / L** fields and a `z` (z‑index) field.
- Each offset field supports variable binding (e.g. `bottom = space/lg`).

### 2.3 Layout
- **Display** — segmented `block · flex · grid · inline · none`. Selecting `flex`/`grid` reveals the
  flow controls (direction + alignment + gap); other values collapse them.
- **Flow** — direction (`row`/`column`/`wrap`) + alignment grid (3×3) + **Gap** field.
- **Dimensions** — `W` / `H`.
- **Min size** / **Max size** — `min-width/height`, `max-width/height` (empty `–` when unset).
- **Overflow** — dropdown `visible · hidden · scroll · auto`.
- **Padding** — `padding-x` / `padding-y` pair, plus an **individual** toggle → per‑side T/R/B/L
  (see state `per-side`). Each side bindable.
- **Margin** — same pattern as padding (per‑side capable).
- **Clip content** — checkbox = `overflow: hidden` shorthand on the box.

### 2.4 Typography *(conditional)*
- Shown only when `isTextElement(el)` is true (element has direct text, no element children).
- Controls: **font‑family** (dropdown), **font‑size** (bindable, e.g. `font/body`), **font‑weight**
  (dropdown), **line‑height**, **letter‑spacing**, **text‑align** (segmented L/C/R/J), **color**
  (bindable color row, e.g. `text/default` + opacity), **text‑transform** (dropdown),
  **text‑decoration** (dropdown).
- Every numeric and color field is bindable (◇ chip).

### 2.5 Appearance
- **Opacity** (0–100%), **Corner radius** (`border-radius`, bindable to a `radius/*` token).

### 2.6 Background
- Type segmented: **Color · Gradient · Image**.
  - **Color** → swatch + token/hex row (bindable, e.g. `surface/surface-0`), opacity, visibility, remove.
  - **Gradient** → stops bar; each stop uses the same color/variable picker (Linear/Radial).
  - **Image** → source row (thumb + filename + Replace) and `background-size` / `position` / `repeat`.
- Header `+` adds a background layer; multiple layers stack (order = paint order).

### 2.7 Border
- Row(s): color (bindable) + opacity + visibility + remove. Settings row: **position** unused for
  DOM → instead `border-style` (solid/dashed/dotted) + **width** + per‑side **individual** toggle
  (T/R/B/L widths). Advanced `⋯` = corner‑specific radii / per‑side colors.

### 2.8 Effects
- Header `+` adds an effect. Row: **type** dropdown (`Drop shadow · Inner shadow · Blur`),
  settings (`⚙` expands to X / Y / Blur / Spread + color), visibility, remove.
- The shadow color is bindable like any color field.

### 2.9 Footer (sticky)
- Left: **change count** with an accent dot (`• 3 changes`). Right: **`Reset`** (secondary) and
  **`Copy config`** (primary, accent). Replaces Figma's Export.
- `Copy config` serializes the current edit diff into the handoff prompt (`prompt.ts`) and writes it
  to the clipboard. `Reset` reverts all edits on the current element to original.

---

## 3. Cross‑cutting behaviors

### 3.1 Selection model
- **None** → No‑selection (Page) view: page background, local variables entry, export of page.
- **Single** → full panel for that element (conditional sections per its computed style).
- **Multiple** (future / multi‑edit) → shared sections; fields with differing values show **`Mixed`**
  (italic, muted). Typing a value writes it to the whole selection.

### 3.2 Variable binding — the core differentiator
- Any value `TokenResolver` can name renders as a **variable chip**: ◇ icon (accent) + token name,
  on a subtle accent‑tint field (`rgba(13,153,255,0.12)`) instead of a raw number/hex.
- Clicking the ◇ opens the **variable picker** (see states `vars-full` / `vars-empty`).
- A field can be **bound** (chip) or **raw** (plain field). Binding is per‑property and applies to
  numbers (size/space/radius) **and** colors. Resolution priority: manifest → runtime CSS vars →
  Tailwind class → raw fallback (`ARCHITECTURE.md` §TokenResolver).

### 3.3 Change tracking / "modified"
- A property the reviewer changed gets a **modified indicator**: a small accent dot before its label,
  accent label color, and a left accent border on the field.
- Each section header shows a **count badge** of modified properties inside it.
- The footer shows the **total** change count.
- Hovering a modified field reveals **↺ reset to original** (per‑property). `Reset` in the footer
  resets the element; `Reset all` in the Changes summary resets across elements.

### 3.4 Copy config (prompt)
- Output format is defined in `ARCHITECTURE.md` §Prompt format: element context (tag/classes/text),
  selector, and a token‑aware `from → to` diff list. The **Changes summary** view shows the same
  data grouped by element before copy.

---

## 4. Field control types & interaction states

**Control types** (from `schema.ts`): `length` (number + unit, bindable), `color` (swatch + value,
bindable), `select` (dropdown), `text` (free value, e.g. line‑height/opacity/shadow).

**Interaction states** every field must implement (reference styling — dark theme):

| State | Field bg | Label | Notes |
|-------|----------|-------|-------|
| default | `#383838` | `#8C8C8C` | value `#EAEAEA` |
| hover | `#4A4A4A` | — | value brightens to `#FFFFFF` |
| focus | `#2C2C2C` + 1px `#0D99FF` border | — | value text selected |
| disabled | `#2E2E2E` | `#5A5A5A` | value `#5A5A5A`; not editable / not applicable |
| **modified** | + left 2px `#0D99FF` border | dot + `#5CC8FF` | shows ↺ on hover |
| **bound** (variable) | `rgba(13,153,255,0.12)` | — | ◇ accent + token name |
| **empty** (no value) | `#383838` | — | value `–` in `#6E6E6E` |
| **mixed** (multi‑select) | `#383838` | — | value `Mixed` italic `#8C8C8C` |

Accent: `#0D99FF`. Secondary text: `#9C9C9C` / `#7A7A7A`. Panel: `#2C2C2C`, canvas `#1A1A1A`,
divider `#1B1B1B`, footer `#262626`. Type: Inter (labels/values 11px; section titles 11px Semi Bold;
identity/breadcrumb/selector in Roboto Mono 10–12px).

---

## 5. State catalog (everything the panel can show)

Each state below has a corresponding mock (Paper) and/or is described for F4. "Trigger" = what puts
the panel in that state.

| State | Trigger | What changes |
|-------|---------|--------------|
| `default` | element selected, no edits | full panel, raw/bound values, footer `0 changes` |
| `empty / no-values` | property unset on the element | numeric fields show `–` (muted); empty Background/Border = header + `+` only |
| `mixed` | multiple elements selected with differing values | field shows `Mixed`; typing unifies |
| `modified` | reviewer changed a property | dot + accent label + left border; section count badge; footer count; hover ↺ |
| `bound` | value resolves to a token | ◇ chip + token name on accent‑tint field |
| `color-picker` | click a color swatch / `+` | picker popover with **Custom / Variables** toggle; Custom = SV + hue/opacity + hex + document colors; Variables = token list |
| `vars-full` | click ◇ on a value with variables present | popover: search + tokens grouped by collection (`surface/`, `text/`, `brand/`); current binding has ✓ |
| `vars-empty` | click ◇ but file has no variables | popover empty state + `Create variable` CTA |
| `detach-variable` | right‑click a bound row / click ◇ | context menu: Edit / **Detach** / Rename / Go to definition; after detach → raw hex |
| `added-fill` / `added-stroke` | `+` on Background/Border | new row (swatch/value/opacity/eye/remove) + settings row (border: style/width/per‑side) |
| `effects-expanded` | `⚙` on an effect | X / Y / Blur / Spread + bindable color |
| `per-side` | `individual` toggle on padding/margin/border | T/R/B/L cross layout, each side bindable |
| `position-absolute` | element is `position: absolute/fixed/sticky` | Position section appears (T/R/B/L + z) |
| `background-expanded` | Background type = Gradient/Image | gradient stops, or image source + size/position/repeat |
| `typography` | element directly contains text | Typography section appears |
| `no-selection` | nothing selected | Page view: background, local variables, export |
| `changes-summary` | open summary / before copy | list across elements: `element · property · from → to`; `Reset all` + `Copy config` |
| interaction states | hover / focus / disabled on any control | per §4 table |

---

## 6. Conditional visibility — quick rules

- **Position** visible ⇔ computed `position ∈ {absolute, fixed, sticky}`.
- **Typography** visible ⇔ `isTextElement(el)` (no element children **and** non‑empty trimmed text).
- **Flow controls** (direction/align/gap) visible ⇔ `display ∈ {flex, inline-flex, grid}`.
- **Per‑side padding/margin/border** visible ⇔ the section's `individual` toggle is on.
- **Background image fields** (size/position/repeat) visible ⇔ background type = Image.
- Empty sections (Background/Border/Effects with no layers) collapse to **header + `+`** only.
- The whole element panel is replaced by **No‑selection (Page)** when selection is empty.

---

## 7. Mapping to code + review notes

The panel's data model is `src/core/schema.ts` (`SCHEMA: GroupSchema[]` + `isTextElement`). The
current schema is **behind the F0 design** and should be extended so code and panel match. Gaps found
while documenting:

- **Layout / Auto layout group** — schema has `display, flex-direction, justify-content, align-items,
  gap, padding-y, padding-x, width, height`. Missing from the design: `margin` (+ per‑side),
  `min/max-width/height`, `overflow`, per‑side `padding`. → add these props.
- **Position group** — not in schema at all. → add a conditional `Position` group
  (`top/right/bottom/left/z-index`, shown only for positioned elements).
- **Background (was "Fill")** — schema only has `background-color`. Design adds gradient + image
  (`background-image/size/position/repeat`). → extend or add controls; keep the group name in code
  as you like but the **panel label is "Background"**.
- **Typography** — schema has `font-size, font-weight, line-height, letter-spacing, text-align,
  color`. Missing: `font-family`, `text-transform`, `text-decoration`. → add.
- **Stroke (was "Border")** — schema has `border-width, border-color, border-style`. Design adds
  **per‑side width** + advanced corners. → add per‑side support.
- **Naming** — the **panel labels** are *Layout, Typography, Appearance, Background, Border, Effects*.
  Internal `group` keys in `schema.ts` may keep `Auto layout / Fill / Stroke`, but the rendered title
  must use the web‑QA labels above.
- **Change tracking + Copy config + variable chip + conditional sections + No‑selection** are panel/Store
  behaviors (this doc §3, §5, §6), not in `schema.ts` — implement in `panel.ts` against `store.ts`.

Keep this file updated as F4 lands; it and the Figma frame (`3:2`) are the panel's two sources of truth.
