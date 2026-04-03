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
        "h3",
        "vite",
        /^node:/,
        /^@hornjs\/core(?:\/.*)?$/,
        /^@hornjs\/app-router(?:\/.*)?$/,
        /^@hornjs\/vue-runtime(?:\/.*)?$/,
        /^@hornjs\/vue-client(?:\/.*)?$/,
        /^@hornjs\/vue-components(?:\/.*)?$/,
        /^@hornjs\/vue-ssr(?:\/.*)?$/,
        /^@hornjs\/http-server(?:\/.*)?$/,
        /^@hornjs\/vite(?:\/.*)?$/,
        /^@hornjs\/dev-server(?:\/.*)?$/,
      ],
      output: {
        globals: {
          vue: "Vue",
          "vue-router": "VueRouter",
          h3: "h3",
        },
      },
    },
  },
});
