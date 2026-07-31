import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve("electron/main.ts"),
      },
    },
    resolve: {
      alias: {
        "@shared": resolve("shared"),
        "@electron": resolve("electron"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve("electron/preload.ts"),
      },
    },
    resolve: {
      alias: {
        "@shared": resolve("shared"),
      },
    },
  },
  renderer: {
    root: resolve("src"),
    build: {
      rollupOptions: {
        input: resolve("src/index.html"),
      },
    },
    resolve: {
      alias: {
        "@": resolve("src"),
        "@shared": resolve("shared"),
      },
    },
    plugins: [react(), tailwindcss()],
  },
});
