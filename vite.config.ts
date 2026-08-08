import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        preview: "src/preview.tsx",
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "storybook/preview-api",
        "storybook-live-code",
      ],
      output: {
        assetFileNames: "styles.css",
      },
    },
  },
});
