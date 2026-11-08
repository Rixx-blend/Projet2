import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "web",
  plugins: [react()],
  // Pas de PostCSS : évite de charger la config du projet parent.
  css: { postcss: {} },
  build: { outDir: "dist", emptyOutDir: true },
});
