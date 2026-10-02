import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Depois de cada teste, desmonta a tela e limpa o que ficou salvo no navegador simulado
afterEach(() => {
  cleanup();
  localStorage.clear();
});
