import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Babylon.js (about 6 MB) is its own chunk, loaded only when the 3D gallery opens.
  build: { chunkSizeWarningLimit: 6500 },
});
