import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Endereço público do site (ex.: http://44.201.46.157), sem barra no final.
// Na AWS, o script de deploy descobre o IP da máquina e define VITE_SITE_URL antes do build.
// No computador fica vazio, e os endereços da prévia do link ficam relativos.
const siteUrl = (process.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

// Troca __SITE_URL__ no index.html pelo endereço do site. As redes sociais só mostram
// a imagem da prévia se o endereço dela for completo (com http://...).
const siteUrlPlugin: Plugin = {
  name: "clutch-site-url",
  transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", siteUrl),
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrlPlugin],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
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
