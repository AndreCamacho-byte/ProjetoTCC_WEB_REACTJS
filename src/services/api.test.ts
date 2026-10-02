import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, SESSION_EXPIRED_EVENT, api, tokenStorage } from "./api";

// Resposta simulada do servidor
const respond = (status: number, body: unknown) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chama o endereço com o prefixo /api e devolve o corpo da resposta", async () => {
    fetchMock.mockResolvedValue(respond(200, { status: "ok" }));

    await expect(api("/health")).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.objectContaining({ method: "GET" }));
  });

  it("envia o corpo como JSON", async () => {
    fetchMock.mockResolvedValue(respond(200, {}));

    await api("/auth/login", { method: "POST", body: { email: "tony@clutch.test" } });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBe('{"email":"tony@clutch.test"}');
  });

  it("não envia cabeçalho de login quando não há token salvo", async () => {
    fetchMock.mockResolvedValue(respond(200, {}));
    await api("/health");
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });

  it("envia o token salvo no cabeçalho Authorization", async () => {
    tokenStorage.set("meu-token");
    fetchMock.mockResolvedValue(respond(200, {}));

    await api("/auth/me");

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer meu-token");
  });

  it("transforma respostas de erro em ApiError, com status, código e detalhes", async () => {
    fetchMock.mockResolvedValue(
      respond(400, {
        error: "Dados inválidos",
        code: "INVALID_CODE",
        details: [{ field: "email", message: "Email inválido" }],
      }),
    );

    const error = await api("/auth/register", { method: "POST", body: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: "Dados inválidos",
      status: 400,
      code: "INVALID_CODE",
      details: [{ field: "email", message: "Email inválido" }],
    });
  });

  it("usa uma mensagem padrão quando o erro vem sem corpo", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 }));

    const error = await api("/health").catch((e) => e);

    expect(error).toMatchObject({ message: "Algo deu errado", status: 502, details: [] });
  });

  it("avisa quando não consegue falar com o servidor (status 0)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = (await api("/health").catch((e) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toContain("Não foi possível conectar");
  });

  it("aceita respostas sem corpo (204)", async () => {
    fetchMock.mockResolvedValue(respond(204, null));
    await expect(api("/users/me", { method: "DELETE", body: { password: "x" } })).resolves.toBeNull();
  });
});

describe("tokenStorage", () => {
  it("salva, lê e apaga o token", () => {
    expect(tokenStorage.get()).toBeNull();
    tokenStorage.set("abc");
    expect(tokenStorage.get()).toBe("abc");
    tokenStorage.clear();
    expect(tokenStorage.get()).toBeNull();
  });
});

describe("sessão encerrada pelo servidor", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("apaga o token e avisa o site quando o servidor responde SESSION_EXPIRED", async () => {
    tokenStorage.set("token-antigo");
    const onExpired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    fetchMock.mockResolvedValue(respond(401, { error: "Sessão encerrada.", code: "SESSION_EXPIRED" }));

    await expect(api("/auth/me")).rejects.toMatchObject({ status: 401, code: "SESSION_EXPIRED" });

    expect(tokenStorage.get()).toBeNull();
    expect(onExpired).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  });

  it("mantém o token em outros erros 401, como senha errada", async () => {
    tokenStorage.set("meu-token");
    fetchMock.mockResolvedValue(respond(401, { error: "Senha incorreta", code: "WRONG_PASSWORD" }));

    await expect(api("/users/me", { method: "DELETE", body: {} })).rejects.toMatchObject({ status: 401 });

    expect(tokenStorage.get()).toBe("meu-token");
  });
});
