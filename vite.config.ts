import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    // Babylon.js (about 6 MB) goes in the 3D experience chunk.
    chunkSizeWarningLimit: 6500,
    rollupOptions: {
      // Paths are relative to the project root.
      input: { experience: "index.html", panel: "panel.html" },
    },
  },
});
