import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// ライブラリ本体のビルド設定。
// react / react-dom は external にして、バンドルに含めない（二重読み込み事故の防止）。
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.js"),
      name: "NineGridChart",
      fileName: (format) =>
        format === "es" ? "ninegrid-chart.js" : "ninegrid-chart.cjs",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
