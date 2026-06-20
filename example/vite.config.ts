import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { designTokens } from "../src/plugin/vite";

const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The example consumes the package straight from source via the alias below,
// so changes to src/ hot-reload here without a build step.
export default defineConfig({
  plugins: [
    react(),
    designTokens({ cssFiles: ["./src/tokens.css"] }),
  ],
  resolve: {
    alias: {
      "visual-qa-inspector/react": fromRoot("../src/react/index.ts"),
      "visual-qa-inspector": fromRoot("../src/index.ts"),
    },
  },
});
