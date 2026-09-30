// Cliente HTTP da API. As rotas são relativas (/api/...): em desenvolvimento o Vite repassa
// para o backend local, e na AWS o Nginx repassa para a EC2 do backend.

const TOKEN_KEY = "clutch.token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.", 0);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.error ?? "Algo deu errado", response.status, data?.details ?? []);
  }

  return data as T;
}
