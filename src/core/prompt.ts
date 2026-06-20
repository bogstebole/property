// Serializes tracked edits into the handoff prompt (Copy config output).

import type { InspectorStore } from "./store";
import { buildSelector, elementContext } from "./selector";

const HEADER =
  "Apply the following visual changes to the project. Use the existing design tokens shown " +
  "(as `var(--token)` or `token.name`) — do not hardcode raw values where a token is given. " +
  "Keep every other style untouched.";

const FOOTER =
  "Write the changes in the project's existing styling system (CSS/Tailwind/styled-components as appropriate).";

export function buildPrompt(store: InspectorStore): string {
  const blocks: string[] = [];

  for (const [el, map] of store.allEdited()) {
    const { tag, classes, text } = elementContext(el);
    const lines = Object.entries(map)
      .filter(([, e]) => e.from !== e.to)
      .map(([prop, e]) => {
        const to = e.token ?? e.to;
        return `  - ${prop}: ${e.from} → ${to}`;
      });

    const classAttr = classes.length ? ` class="${classes.join(" ")}"` : "";
    const comment = text ? `  // "${text}"` : "";
    blocks.push(
      `Element: <${tag}${classAttr}>${comment}\n` +
        `Selector: ${buildSelector(el)}\n` +
        `Changes:\n${lines.join("\n")}`
    );
  }

  if (!blocks.length) return "No changes yet.";
  return `${HEADER}\n\n${blocks.join("\n\n")}\n\n${FOOTER}`;
}
