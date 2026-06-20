// Vite plugin (F3). At build/dev time it assembles a design-token manifest from
// the project's source of truth and injects it into index.html as
// <script id="design-tokens" type="application/json">. The runtime TokenResolver
// reads this to get exact token names regardless of Tailwind/SCSS/CSS-vars.
//
// Usage (vite.config.ts):
//   import { designTokens } from "visual-qa-inspector/vite";
//   plugins: [designTokens({ tailwindConfig: "./tailwind.config.js" })]

import { promises as fs } from "node:fs";
import path from "node:path";

export interface DesignTokensOptions {
  /** Inline token object (DTCG nested or flat { name: value }). */
  tokens?: Record<string, unknown>;
  /** Path to a tailwind config; theme is resolved and flattened. */
  tailwindConfig?: string;
  /** CSS files to scan for :root custom properties. */
  cssFiles?: string[];
  /** Only inject in these modes. Defaults to ["development"]. */
  modes?: string[];
}

/** Minimal structural type for a Vite plugin — avoids a hard dependency on vite. */
interface VitePluginLike {
  name: string;
  configResolved: (config: { mode: string }) => void;
  transformIndexHtml: {
    order: "pre";
    handler: (html: string) => Promise<{ html: string; tags: unknown[] }>;
  };
}

export function designTokens(options: DesignTokensOptions = {}): VitePluginLike {
  const modes = options.modes ?? ["development"];
  let currentMode = "development";

  return {
    name: "visual-qa-inspector:design-tokens",
    configResolved(config) {
      currentMode = config.mode;
    },
    transformIndexHtml: {
      order: "pre",
      async handler(html: string) {
        if (!modes.includes(currentMode)) return { html, tags: [] };
        const manifest = await assembleManifest(options);
        return {
          html,
          tags: [
            {
              tag: "script",
              attrs: { id: "design-tokens", type: "application/json" },
              children: JSON.stringify(manifest),
              injectTo: "head",
            },
          ],
        };
      },
    },
  };
}

async function assembleManifest(options: DesignTokensOptions): Promise<Record<string, unknown>> {
  const manifest: Record<string, unknown> = {};

  if (options.tokens) Object.assign(manifest, options.tokens);

  if (options.tailwindConfig) {
    Object.assign(manifest, await tokensFromTailwind(options.tailwindConfig));
  }

  if (options.cssFiles?.length) {
    for (const file of options.cssFiles) {
      Object.assign(manifest, await tokensFromCss(file));
    }
  }

  return manifest;
}

async function tokensFromTailwind(configPath: string): Promise<Record<string, string>> {
  try {
    const abs = path.resolve(configPath);
    const mod = await import(abs);
    const config = mod.default ?? mod;
    // resolveConfig is optional; only flatten the theme we can read.
    let theme = config.theme ?? {};
    try {
      // Specifier built at runtime so TS does not require tailwind to be installed.
      const spec = "tailwindcss/resolveConfig.js";
      const resolver = (await import(/* @vite-ignore */ spec)) as {
        default: (c: unknown) => { theme: Record<string, unknown> };
      };
      theme = resolver.default(config).theme;
    } catch {
      /* tailwind not installed — use raw theme */
    }
    return flattenTheme(theme as Record<string, unknown>);
  } catch {
    return {};
  }
}

/** Flatten Tailwind theme groups (colors, spacing, borderRadius...) to flat tokens. */
function flattenTheme(theme: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const groups: Record<string, string> = {
    colors: "color",
    spacing: "space",
    borderRadius: "radius",
    fontSize: "size",
    boxShadow: "shadow",
  };
  for (const [group, prefix] of Object.entries(groups)) {
    const section = theme[group];
    if (!section || typeof section !== "object") continue;
    walk(section as Record<string, unknown>, prefix, out);
  }
  return out;
}

function walk(obj: Record<string, unknown>, prefix: string, out: Record<string, string>): void {
  for (const [key, val] of Object.entries(obj)) {
    const name = key === "DEFAULT" ? prefix : `${prefix}.${key}`;
    if (typeof val === "string") out[name] = val;
    else if (Array.isArray(val) && typeof val[0] === "string") out[name] = val[0];
    else if (val && typeof val === "object") walk(val as Record<string, unknown>, name, out);
  }
}

async function tokensFromCss(file: string): Promise<Record<string, string>> {
  try {
    const css = await fs.readFile(path.resolve(file), "utf8");
    const out: Record<string, string> = {};
    const rootBlocks = css.match(/:root\s*{([^}]*)}/g) ?? [];
    for (const block of rootBlocks) {
      const decls = block.match(/--[\w-]+\s*:\s*[^;]+/g) ?? [];
      for (const decl of decls) {
        const [name, value] = decl.split(/:(.+)/);
        out[name.trim()] = value.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}
