// Cliente HTTP da API. As rotas são relativas (/api/...): em desenvolvimento o Vite repassa
// para o backend local, e na AWS o Nginx repassa para a EC2 do backend.

const TOKEN_KEY = "clutch.token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Evento disparado quando o servidor encerra a sessão (o AuthProvider escuta)
export const SESSION_EXPIRED_EVENT = "clutch:session-expired";

export type FieldError = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: FieldError[] = [],
    // Código do erro enviado pelo backend (ex.: EMAIL_NOT_VERIFIED)
    public readonly code?: string,
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
    // O servidor avisou que este login não vale mais (senha trocada em outro aparelho, conta excluída...):
    // apaga o token e avisa o site, que volta para o estado "deslogado"
    if (data?.code === "SESSION_EXPIRED") {
      tokenStorage.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(data?.error ?? "Algo deu errado", response.status, data?.details ?? [], data?.code);
  }

  return data as T;
}
