import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/",
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:2300",
        changeOrigin: true,
        secure: false,
        // Если бэк ожидает без /api, раскомментируй rewrite:
        // rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
