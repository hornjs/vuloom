import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "vite-plugin": resolve(__dirname, "src/vite-plugin.ts"),
      },
      name: "Phial",
      formats: ["es"],
      fileName: (_format, entryName) => (entryName === "index" ? "index.js" : `${entryName}.js`),
    },
    rollupOptions: {
      external: [
        "vue",
        "vue-router",
        "vite",
        /^node:/,
        /^@hornjs\/fest(?:\/.*)?$/,
        /^fs-route-ir(?:\/.*)?$/,
        /^vuepagelet(?:\/.*)?$/,
      ],
      output: {
        globals: {
          vue: "Vue",
          "vue-router": "VueRouter",
        },
      },
    },
  },
});
