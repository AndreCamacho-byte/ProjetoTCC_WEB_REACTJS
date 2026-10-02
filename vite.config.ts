import { defineConfig } from "vitest/config";
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
  // Testes unitários (npm test): rodam em um navegador simulado (jsdom)
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    mockReset: true,
  },
});
