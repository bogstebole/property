# CLAUDE.md — Project guide for AI agents

> Read this file first. It defines what we are building and the rules that keep work on track.
> If a request conflicts with this file, stop and flag the conflict before acting.

## What we are building

A **visual QA tool** that a developer installs once into a project via npm. When the app
runs in dev/staging, the tool lets a designer/reviewer:

1. **Select any element** on the live page (like browser DevTools).
2. **Edit its parameters** through a clean, **Figma-style property panel** — not raw CSS.
3. **Copy config** → generate a precise prompt that an AI agent or another dev can act on
   to make the real code change.

Edits happen **on the web only**. The tool never writes to source code. Its output is a spec
(prompt), not a code patch.

## The core differentiator

Edits use the **project's real design tokens**, never hardcoded values. When a reviewer changes
a color or spacing, the output references `var(--color-accent)` / `space.4` — the actual token
name from the project — so the downstream agent/dev applies an exact, on-system change.

## Mental model (do not confuse these)

- This is **NOT DialKit.** DialKit reads a config object the dev writes by hand and binds
  manually to components. It never touches the DOM. We read the **live DOM** of a selected
  element and the project's tokens. Different category.
- The closest reference is **VisBug** (visual editing on any page) — but with a structured
  Figma-style panel and token awareness, which VisBug lacks.

## Decisions already made (do not re-litigate without explicit user request)

| Decision | Choice | Why |
|---|---|---|
| Distribution | **npm package installed in the project** (Option B) | Gives exact tokens from source + self-contained. User trusts this over runtime-only guessing. |
| Chrome extension | **Not now.** Optional later. | If installed in the project, the same package injects the inspector AND reads tokens. Extension only needed for sites where you can't touch the build. |
| Framework support | **React only** for the mount wrapper. | Tool is framework-agnostic by nature (reads DOM). Multi-framework = overkill. Core is vanilla TS; adding Vue/Svelte later is a ~10-line wrapper. |
| Token source | **Layered TokenResolver** + build plugin emitting a DTCG manifest | Works across CSS vars, Tailwind, SCSS, JS theme. Never hardcoded to one project. |
| Panel rendering | **Web Component (Shadow DOM)** | Tool's CSS must not leak into the host app, and vice versa. |
| Output | **Prompt (spec), not code patch** | Tool does QA, downstream agent/dev does the code change. |
| Production safety | Inspector loads **only in dev/staging** (env flag), off in production | — |

## Non-negotiable principles

1. **Zero project assumptions.** The package must not hardcode the user's token names, folders,
   or conventions. Everything generic. Build it as if it's a public npm package from day one.
2. **Tokens over raw values, always.** Any editable value tries to resolve to a token name first.
   Raw values are a labeled fallback, never the default.
3. **Never modify host source.** The tool reads the DOM and writes inline styles for preview only.
4. **Framework-agnostic core.** All heavy logic (picker, store, resolver, panel) is vanilla TS.
   Framework code is only the thin mount wrapper.
5. **Panel matches the user's Figma design 1:1** once provided. Until then, do not invent final UI.

## Glossary

- **Runtime CSS** — styles as the browser computed them while the page runs (`padding: 16px`).
  Opposite of source (`p-4`, `$space-4`).
- **Manifest** — a JSON file listing all design tokens (`name → value`), generated from code by
  the build plugin, consumed by the tool at runtime. Target format: **DTCG** (W3C Design Tokens).
- **TokenResolver** — module that maps a computed value or class name back to a token name, using
  layered sources (manifest → runtime CSS vars → Tailwind classes → raw fallback).
- **Copy config** — the action that serializes all tracked edits into the handoff prompt.

## Status

See `PLAN.md` for phases and current progress. See `ARCHITECTURE.md` for technical detail.
A working single-file proof-of-concept exists at `prototype.html` (validates picker + panel +
token reading + prompt). It is a reference, not the final package structure.
