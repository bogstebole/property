// Public, framework-agnostic API.

import { VisualQAInspector, defineInspector, type InspectorOptions } from "./ui/panel";

export { VisualQAInspector } from "./ui/panel";
export type { InspectorOptions } from "./ui/panel";
export type { TokenSource } from "./core/tokens";
export type { Token, TokenFamily } from "./core/types";

/**
 * Mount the inspector into the page. Call once, in dev/staging only.
 * Returns a cleanup function that removes it.
 */
export function createInspector(opts: InspectorOptions = {}): () => void {
  defineInspector();
  const el = document.createElement("visual-qa-inspector") as VisualQAInspector;
  el.configure(opts);
  document.body.appendChild(el);
  return () => el.remove();
}
