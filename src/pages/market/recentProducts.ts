// "Últimas visitas": os produtos que a pessoa abriu ficam guardados só no navegador dela.
// O navegador pode bloquear esse armazenamento (aba anônima, por exemplo): aí a seção só não aparece.

const KEY = "clutch.recent-products";
const MAX = 12;

export function getRecentProducts(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

// Coloca o produto no começo da lista (sem repetir)
export function rememberProduct(id: string) {
  try {
    const next = [id, ...getRecentProducts().filter((item) => item !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sem armazenamento: não guarda, e tudo continua funcionando
  }
}
