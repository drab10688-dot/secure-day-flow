import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // Build a Node.js server bundle for self-hosting (Docker/VPS).
  // Output: dist/server (Node server) + dist/client (static assets).
  nitro: {
    preset: "node-server",
  },
});
