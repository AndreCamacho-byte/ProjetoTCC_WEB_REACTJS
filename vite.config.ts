import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Em desenvolvimento, as chamadas para /api vão para o backend local.
    // Na AWS quem faz esse papel é o Nginx (location /api no main.tf).
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
