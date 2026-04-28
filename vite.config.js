import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
// 配置element-plus的按需引入
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("element-plus") || id.includes("@element-plus")) {
            return "vendor-element-plus";
          }
          if (
            id.includes("/vue/") ||
            id.includes("/@vue/") ||
            id.includes("vue-router") ||
            id.includes("pinia")
          ) {
            return "vendor-vue";
          }
          if (
            id.includes("markdown-it") ||
            id.includes("dompurify") ||
            id.includes("entities") ||
            id.includes("linkify-it") ||
            id.includes("mdurl") ||
            id.includes("uc.micro")
          ) {
            return "vendor-markdown";
          }
          if (id.includes("lucide-vue-next")) {
            return "vendor-icons";
          }
          if (id.includes("axios")) {
            return "vendor-axios";
          }
          return "vendor-misc";
        },
      },
    },
  },
});
