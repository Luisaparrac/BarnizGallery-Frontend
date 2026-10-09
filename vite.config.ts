import { defineConfig } from "vite";

// Dev server on 5173: it is one of the origins the backend allows by default (CORS_ALLOWED_ORIGINS).
export default defineConfig({
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2500 },
});
