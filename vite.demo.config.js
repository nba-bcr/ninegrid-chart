import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// デモサイト（Cloudflare Pages などに置く用）のビルド設定。
export default defineConfig({
  plugins: [react()],
  root: "demo",
  build: {
    outDir: "../dist-demo",
    emptyOutDir: true,
  },
});
