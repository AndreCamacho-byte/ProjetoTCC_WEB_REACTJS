// Chaves de "Lembrar este aparelho", uma por email (o mesmo computador pode ser usado por
// mais de uma conta). Ficam só neste navegador; sem elas, o login pede o código por email.
const KEY = "clutch.devices";

function read(): Record<string, string> {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function write(devices: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(devices));
  } catch {
    // Navegador sem armazenamento (ex.: aba anônima bloqueada): só não lembra o aparelho
  }
}

const normalize = (email: string) => email.trim().toLowerCase();

export const deviceTokens = {
  get: (email: string): string | undefined => read()[normalize(email)],
  set: (email: string, token: string) => write({ ...read(), [normalize(email)]: token }),
  remove: (email: string) => {
    const devices = read();
    delete devices[normalize(email)];
    write(devices);
  },
};
