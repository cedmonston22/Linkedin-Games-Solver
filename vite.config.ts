import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig({
  base: "",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content/index.ts"),
        background: resolve(__dirname, "src/background/index.ts"),
        popup: resolve(__dirname, "src/popup/index.html"),
      },
      output: {
        // Use ES modules — background supports it via "type": "module" in manifest.
        // Content script will be loaded as a regular script, so avoid top-level await.
        format: "es",
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].js",
        assetFileNames: "assets/[name].[ext]",
        // Inline everything into each entry so content.js is self-contained
        manualChunks: undefined,
      },
    },
  },
  plugins: [
    {
      name: "copy-manifest",
      closeBundle() {
        copyFileSync(
          resolve(__dirname, "manifest.json"),
          resolve(__dirname, "dist/manifest.json")
        );
      },
    },
  ],
});
