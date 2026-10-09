import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

/** Swap server-only modules for their in-browser equivalents. */
function hostedBuild(): Plugin {
  return {
    name: "lingora-hosted",
    enforce: "pre",
    resolveId(source, importer) {
      if (source === "./claude" && importer?.includes(`${path.sep}lib${path.sep}server${path.sep}`)) {
        return path.resolve(here, "claude-local.ts");
      }
      // lib/*.ts import the API client relatively.
      if (source === "./client" && importer && path.dirname(importer) === path.join(root, "lib")) {
        return path.resolve(here, "client.ts");
      }
      return null;
    },
  };
}

export default defineConfig({
  root: here,
  plugins: [hostedBuild(), react(), viteSingleFile()],
  resolve: {
    alias: [
      { find: "@/lib/client", replacement: path.resolve(here, "client.ts") },
      { find: "next/link", replacement: path.resolve(here, "shims/next-link.tsx") },
      { find: "next/navigation", replacement: path.resolve(here, "shims/next-navigation.ts") },
      { find: "server-only", replacement: path.resolve(here, "shims/server-only.ts") },
      { find: /^@\//, replacement: `${root}/` },
    ],
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          config: path.resolve(root, "tailwind.config.ts"),
          content: [`${root}/app/**/*.{ts,tsx}`, `${root}/components/**/*.{ts,tsx}`, `${here}/**/*.{ts,tsx}`],
        } as never),
        autoprefixer(),
      ],
    },
  },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { outDir: path.resolve(root, "artifact-dist"), emptyOutDir: true, target: "es2020", chunkSizeWarningLimit: 4000 },
});
