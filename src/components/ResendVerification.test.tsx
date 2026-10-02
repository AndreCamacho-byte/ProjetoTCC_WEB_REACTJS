import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/auth", () => ({ authService: { resendVerification: vi.fn() } }));

import { ApiError } from "@/services/api";
import { authService } from "@/services/auth";
import { ResendVerification } from "./ResendVerification";

const resend = vi.mocked(authService.resendVerification);
const button = () => screen.getByRole("button");

// Avança o relógio simulado, um segundo por vez, deixando a tela se atualizar a cada passo
async function passSeconds(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe("ResendVerification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resend.mockResolvedValue({ message: "ok" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("começa liberado quando o email não acabou de ser enviado", () => {
    render(<ResendVerification email="tony@clutch.test" />);
    expect(button()).toHaveTextContent("Reenviar email");
    expect(button()).toBeEnabled();
  });

  it("logo depois do cadastro, espera 60 segundos antes de liberar", async () => {
    render(<ResendVerification email="tony@clutch.test" startWithCooldown />);

    expect(button()).toHaveTextContent("Reenviar email (60s)");
    expect(button()).toBeDisabled();

    await passSeconds(59);
    expect(button()).toHaveTextContent("Reenviar email (1s)");
    expect(button()).toBeDisabled();

    await passSeconds(1);
    expect(button()).toHaveTextContent("Reenviar email");
    expect(button()).toBeEnabled();
  });

  it("reenvia para o email informado, avisa e volta a esperar", async () => {
    render(<ResendVerification email="tony@clutch.test" />);

    await act(async () => {
      fireEvent.click(button());
    });

    expect(resend).toHaveBeenCalledWith("tony@clutch.test");
    expect(screen.getByRole("status")).toHaveTextContent("Enviamos um novo código");
    expect(button()).toBeDisabled();
    expect(button()).toHaveTextContent("(60s)");
  });

  it("mostra o erro e deixa tentar de novo quando o envio falha", async () => {
    resend.mockRejectedValue(new ApiError("fora do ar", 503));
    render(<ResendVerification email="tony@clutch.test" />);

    await act(async () => {
      fireEvent.click(button());
    });

    expect(screen.getByRole("status")).toHaveTextContent("Nossos servidores estão fora do ar");
    expect(button()).toBeEnabled();
  });

  it("fica desativado enquanto o email não foi informado", () => {
    render(<ResendVerification email="" />);
    expect(button()).toBeDisabled();
  });
});
