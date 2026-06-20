// Thin React mount wrapper. Render once at the app root, dev/staging only:
//
//   {import.meta.env.DEV && <InspectorRoot />}
//
// All heavy logic lives in the framework-agnostic core; this just manages the
// mount lifecycle.

import { useEffect } from "react";
import { createInspector, type InspectorOptions } from "../index";

export interface InspectorRootProps extends InspectorOptions {
  /** Set false to disable without unmounting parents. Defaults to true. */
  enabled?: boolean;
}

export function InspectorRoot({ enabled = true, tokens }: InspectorRootProps): null {
  useEffect(() => {
    if (!enabled) return;
    const cleanup = createInspector({ tokens });
    return cleanup;
    // tokens is expected to be stable; re-mounting on change is acceptable.
  }, [enabled, tokens]);

  return null;
}
