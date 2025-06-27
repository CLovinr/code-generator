import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import VueComponents from "unplugin-vue-components/vite";
// import { VantResolver } from "@vant/auto-import-resolver";

// import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  server: {},
  plugins: [
    vue(),
    // vueDevTools(),
    AutoImport({
      imports: ["vue", "pinia"],
    }),
    VueComponents({}),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "../code-generator-dusk/dist/webview-view",
    emptyOutDir: true,
    sourcemap: true,
  },
});
