import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Lovable's TanStack Start config wrapper handles Tailwind, tsconfig paths,
// the TanStack Start plugin and React automatically.
//
// `nitro: true` force-enables the Nitro deploy build with the Cloudflare
// `cloudflare-module` preset, so a `vite build` from your own CI (outside the
// Lovable sandbox) emits the Worker bundle that wrangler.json expects:
//   - .output/server/index.mjs  (Worker entry → wrangler `main`)
//   - .output/public            (static assets → wrangler `assets.directory`)
export default defineConfig({
  nitro: true,
});
