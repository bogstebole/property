# PLAN.md — Build plan

Read `CLAUDE.md` first for vision and locked decisions. This file is the phased plan and the
build/test workflow. Keep it updated as phases complete.

## Goal recap

One npm package. `npm install` once into a project → it (1) emits a token manifest at build time
and (2) injects a Figma-style inspector at runtime (dev/staging only). Reviewer selects elements,
edits with real tokens, clicks **Copy config** → precise handoff prompt. No source edits.

## Package shape

```
inspector/
  src/
    core/            # vanilla TS, framework-agnostic
      store.ts       # selection + edit diff + undo/redo (pattern borrowed from DialKit's DialStore)
      picker.ts      # hover highlight, click select, Esc cancel
      schema.ts      # CSS property -> panel group mapping
      selector.ts    # robust selector generation for the prompt
      prompt.ts      # serialize edits -> handoff prompt
      tokens.ts      # TokenResolver (layered)
    ui/
      panel.ts       # Web Component (Shadow DOM), renders the Figma-style panel
    plugin/
      vite.ts        # build plugin: emits DTCG token manifest
    react/
      InspectorRoot.tsx  # ~10-line mount wrapper (dev/staging only)
    index.ts
  example/           # React + Vite demo app with CSS vars + Tailwind tokens (primary dev surface)
  tests/             # Vitest unit + Playwright e2e
```

## Phases

- [ ] **F0 — Panel design (USER).** Figma frame of the sidebar. Blocks F4 only.
- [x] **F1 — Core.** store (+ undo/redo), picker, schema, selector, prompt. Unit tested.
- [x] **F2 — TokenResolver.** Layered: manifest → runtime CSS vars → Tailwind classes → raw fallback.
      Reverse maps value→token and class→token. Raw values labeled as non-token.
- [x] **F3 — Token build plugin (Vite).** Assembles manifest from Tailwind config / CSS vars / inline
      tokens, injects `<script id="design-tokens">` in dev/staging only. Verified injecting in `example/`.
- [x] **F4 — UI panel (Web Component).** Built 1:1 from the Figma spec (`SIDEBAR_SPEC.md`): identity
      header + breadcrumb + selector, conditional Position/Typography/Flow, modified state + section
      badges + changes drawer, variable chips (bind/detach), exact §4 colors. Verified in `example/`.
- [x] **F5 — Packaging.** ESM build via tsup, exports `.` / `./react` / `./vite`. Typecheck + build green.
- [ ] **F6 — Publish (later).** `npm publish`, versioning, MIT license, optional docs site.

**Status:** F1–F3 + F5 done and verified (typecheck clean, 9/9 unit tests pass, example dev server
injects the token manifest). F4 has a working placeholder panel; awaiting Figma design to finalize.
e2e (Playwright) not yet written.

F1–F3 do not depend on the panel design and can start immediately.

## Build & test workflow

The package is developed standalone but runs inside a host project. Three test layers:

1. **Playground (`example/`)** — primary dev surface. A real React+Vite mini-app with tokens
   (CSS vars + Tailwind). `npm run dev` opens it with the inspector mounted. Hot reload. 90% of
   work happens here. This is `prototype.html` split into package + demo.

2. **Real project via `npm link`** — verify the token plugin against a real Tailwind/SCSS setup:
   ```
   cd inspector && npm link
   cd ../real-project && npm link inspector
   ```
   The real project uses the local package as if installed from npm.

3. **Automated tests:**
   - **Unit (Vitest):** TokenResolver value→name mapping, selector generation, prompt builder.
   - **E2E (Playwright):** open demo → select element → change padding → Copy config → assert prompt.

Testing order per phase:
- F1–F2: unit tests + manual in `example/`.
- F3: `npm link` into a real Tailwind project, verify manifest correctness.
- F4: visual in `example/` + Playwright e2e.

## Definition of done (MVP)

- Install in a React project, inspector appears in dev only.
- Select element → Figma-style panel shows grouped, editable params.
- Edits resolve to real token names (via manifest or runtime).
- Copy config produces a prompt with selector + element context + token-aware diffs.
- Unit + e2e green.

## Open items

- F0 (panel design) is on the user. F1–F3 can proceed in parallel.
- DTCG manifest schema details to finalize in F3.
