import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));

import { useAuth } from "@/hooks/useAuth";
import { makeUser, renderAt } from "@/test/helpers";
import type { User } from "@/types/user";
import { AgeGate } from "./AgeGate";
import { AdminRoute, PrivateRoute, PublicOnlyRoute } from "./RouteGuards";

// Define quem está "logado" no teste
function loginAs(user: User | null, loading = false) {
  vi.mocked(useAuth).mockReturnValue({ user, loading, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() });
}

const yearsAgo = (years: number) => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear() - years}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00.000Z`;
};

const currentPath = () => screen.getByTestId("location").textContent;
const currentState = () => JSON.parse(screen.getByTestId("location").dataset.state ?? "null");

describe("PrivateRoute", () => {
  const page = (
    <PrivateRoute>
      <p>área logada</p>
    </PrivateRoute>
  );

  it("mostra a página para quem está logado", () => {
    loginAs(makeUser());
    renderAt(page, { path: "/conta" });
    expect(screen.getByText("área logada")).toBeInTheDocument();
  });

  it("manda para o login quem não está logado, lembrando de onde veio", () => {
    loginAs(null);
    renderAt(page, { path: "/conta" });

    expect(screen.queryByText("área logada")).not.toBeInTheDocument();
    expect(currentPath()).toBe("/login");
    expect(currentState()).toEqual({ from: "/conta" });
  });

  it("espera enquanto confere a sessão, sem redirecionar", () => {
    loginAs(null, true);
    renderAt(page, { path: "/conta" });

    expect(screen.queryByText("área logada")).not.toBeInTheDocument();
    expect(currentPath()).toBe("/conta");
  });
});

describe("PublicOnlyRoute", () => {
  const page = (
    <PublicOnlyRoute>
      <p>tela de login</p>
    </PublicOnlyRoute>
  );

  it("mostra a tela para quem não está logado", () => {
    loginAs(null);
    renderAt(page, { path: "/login" });
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("manda para a home quem já está logado", () => {
    loginAs(makeUser());
    renderAt(page, { path: "/login" });
    expect(currentPath()).toBe("/");
  });
});

describe("AdminRoute", () => {
  const page = (
    <AdminRoute>
      <p>painel admin</p>
    </AdminRoute>
  );

  it("mostra o painel para administradores", () => {
    loginAs(makeUser({ role: "ADMIN" }));
    renderAt(page, { path: "/admin" });
    expect(screen.getByText("painel admin")).toBeInTheDocument();
  });

  it("manda a conta comum de volta para a home", () => {
    loginAs(makeUser({ role: "USER" }));
    renderAt(page, { path: "/admin" });

    expect(screen.queryByText("painel admin")).not.toBeInTheDocument();
    expect(currentPath()).toBe("/");
  });

  it("manda para o login quem não está logado", () => {
    loginAs(null);
    renderAt(page, { path: "/admin" });
    expect(currentPath()).toBe("/login");
  });
});

describe("AgeGate", () => {
  const page = (
    <AgeGate area="Explorar">
      <p>mapa de spots</p>
    </AgeGate>
  );

  it("libera quem tem 12 anos ou mais", () => {
    loginAs(makeUser({ birthDate: yearsAgo(12) }));
    renderAt(page);
    expect(screen.getByText("mapa de spots")).toBeInTheDocument();
  });

  it("bloqueia menores de 12 anos", () => {
    loginAs(makeUser({ birthDate: yearsAgo(10) }));
    renderAt(page);

    expect(screen.queryByText("mapa de spots")).not.toBeInTheDocument();
    expect(screen.getByText("Acesso restrito")).toBeInTheDocument();
    expect(screen.getByText(/a partir dos 12 anos/)).toBeInTheDocument();
  });

  it("bloqueia conta sem data de nascimento e leva às configurações", () => {
    loginAs(makeUser({ birthDate: null }));
    renderAt(page);

    expect(screen.queryByText("mapa de spots")).not.toBeInTheDocument();
    expect(screen.getByText("Idade não verificada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Informar data de nascimento" })).toHaveAttribute("href", "/conta");
  });

  it("mostra a página para quem não está logado", () => {
    loginAs(null);
    renderAt(page);
    expect(screen.getByText("mapa de spots")).toBeInTheDocument();
  });

  it("não mostra nada enquanto confere a sessão", () => {
    loginAs(null, true);
    renderAt(page);
    expect(screen.queryByText("mapa de spots")).not.toBeInTheDocument();
    expect(screen.queryByText("Acesso restrito")).not.toBeInTheDocument();
  });
});
