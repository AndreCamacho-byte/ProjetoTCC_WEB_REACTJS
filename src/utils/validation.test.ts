import { describe, expect, it } from "vitest";
import { ApiError } from "@/services/api";
import {
  getErrorMessage,
  todayIso,
  validateBirthDate,
  validateEmail,
  validateName,
  validateNewPassword,
} from "./validation";

describe("validateName", () => {
  it("exige pelo menos 2 letras, sem contar espaços", () => {
    expect(validateName("")).toBe("Informe seu nome");
    expect(validateName(" A ")).toBe("Informe seu nome");
    expect(validateName("Jo")).toBeUndefined();
  });
});

describe("validateEmail", () => {
  it("pede o email quando está vazio", () => {
    expect(validateEmail("   ")).toBe("Informe seu email");
  });

  it.each(["tony", "tony@", "tony@clutch", "tony @clutch.com", "@clutch.com"])("recusa %j", (email) => {
    expect(validateEmail(email)).toBe("Informe um email válido");
  });

  it("aceita um email válido, mesmo com espaços nas pontas", () => {
    expect(validateEmail("tony@clutch.com")).toBeUndefined();
    expect(validateEmail("  tony@clutch.com ")).toBeUndefined();
  });
});

describe("validateNewPassword", () => {
  it("exige 8 caracteres", () => {
    expect(validateNewPassword("1234567")).toBe("A senha precisa ter pelo menos 8 caracteres");
    expect(validateNewPassword("12345678")).toBeUndefined();
  });
});

describe("validateBirthDate", () => {
  it("exige a data", () => {
    expect(validateBirthDate("")).toBe("Informe sua data de nascimento");
  });

  it("recusa data no futuro e datas absurdas", () => {
    expect(validateBirthDate("2999-01-01")).toBe("A data não pode estar no futuro");
    expect(validateBirthDate("1800-01-01")).toBe("Informe uma data válida");
  });

  it("aceita hoje e datas passadas", () => {
    expect(validateBirthDate(todayIso())).toBeUndefined();
    expect(validateBirthDate("2005-05-12")).toBeUndefined();
  });
});

describe("todayIso", () => {
  it("devolve a data de hoje no formato do campo de data", () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    expect(todayIso()).toBe(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  });
});

describe("getErrorMessage", () => {
  it("usa uma mensagem genérica para erros que não vieram da API", () => {
    expect(getErrorMessage(new Error("qualquer"))).toBe("Algo deu errado. Tente novamente.");
    expect(getErrorMessage(undefined)).toBe("Algo deu errado. Tente novamente.");
  });

  it.each([
    [401, "Email ou senha incorretos"],
    [409, "Este email já está cadastrado"],
    [503, "Nossos servidores estão fora do ar. Tente de novo em instantes."],
    [500, "Algo deu errado. Tente novamente."],
  ])("traduz o status %i", (status, message) => {
    expect(getErrorMessage(new ApiError("mensagem do servidor", status))).toBe(message);
  });

  it("mostra a mensagem de falha de conexão (status 0)", () => {
    expect(getErrorMessage(new ApiError("Não foi possível conectar ao servidor.", 0))).toBe(
      "Não foi possível conectar ao servidor.",
    );
  });

  it("prioriza o código do erro sobre o status", () => {
    expect(getErrorMessage(new ApiError("x", 403, [], "EMAIL_NOT_VERIFIED"))).toBe(
      "Confirme seu email antes de entrar.",
    );
    expect(getErrorMessage(new ApiError("x", 400, [], "INVALID_TOKEN"))).toContain("inválido ou expirou");
  });

  it("repassa a mensagem do servidor para erros do código de 6 dígitos", () => {
    expect(getErrorMessage(new ApiError("Código incorreto. Confira o email.", 400, [], "INVALID_CODE"))).toBe(
      "Código incorreto. Confira o email.",
    );
    expect(getErrorMessage(new ApiError("Muitas tentativas erradas.", 429, [], "TOO_MANY_ATTEMPTS"))).toBe(
      "Muitas tentativas erradas.",
    );
  });
});

describe("getErrorMessage: limite de tentativas e sessão", () => {
  it("repassa o aviso do servidor com o tempo de espera", () => {
    const error = new ApiError("Muitas tentativas. Tente de novo em 10 minutos.", 429, [], "RATE_LIMITED");
    expect(getErrorMessage(error)).toBe("Muitas tentativas. Tente de novo em 10 minutos.");
  });

  it("avisa quando a sessão foi encerrada pelo servidor", () => {
    expect(getErrorMessage(new ApiError("x", 401, [], "SESSION_EXPIRED"))).toBe(
      "Sua sessão foi encerrada. Entre de novo.",
    );
  });
});
