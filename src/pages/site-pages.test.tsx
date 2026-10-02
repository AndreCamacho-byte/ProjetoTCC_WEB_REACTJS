import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/account", () => ({
  accountService: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    setBirthDate: vi.fn(),
    setAvatar: vi.fn(),
    removeAvatar: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { accountService } from "@/services/account";
import { ApiError } from "@/services/api";
import { makeUser, renderAt } from "@/test/helpers";
import type { User } from "@/types/user";
import { AccountSettingsPage } from "./AccountSettingsPage";
import { HomePage } from "./HomePage";
import { NotFoundPage } from "./NotFoundPage";

const service = vi.mocked(accountService);
const signIn = vi.fn();
const updateUser = vi.fn();

function loginAs(user: User | null) {
  vi.mocked(useAuth).mockReturnValue({ user, loading: false, signIn, signOut: vi.fn(), updateUser });
}

describe("Homepage", () => {
  it("para visitantes, convida a criar conta", () => {
    loginAs(null);
    renderAt(<HomePage />);

    expect(screen.getByRole("link", { name: "Participe" })).toHaveAttribute("href", "/register");
    expect(screen.getByLabelText("Seu e-mail")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Explorar spots" })).not.toBeInTheDocument();
  });

  it("para quem já está logado, troca o convite por atalhos para os spots e os encontros", () => {
    loginAs(makeUser());
    renderAt(<HomePage />);

    expect(screen.getByRole("link", { name: "Explorar spots" })).toHaveAttribute("href", "/explorar");
    expect(screen.getByRole("link", { name: "ver encontros" })).toHaveAttribute("href", "/eventos");
    expect(screen.queryByRole("link", { name: "Participe" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Seu e-mail")).not.toBeInTheDocument();
  });

  it("o formulário do visitante leva para o cadastro com o email já preenchido", async () => {
    loginAs(null);
    renderAt(<HomePage />);

    await userEvent.type(screen.getByLabelText("Seu e-mail"), "  tony@clutch.test ");
    await userEvent.click(screen.getByRole("button", { name: "participar" }));

    const location = screen.getByTestId("location");
    expect(location).toHaveTextContent("/register");
    expect(JSON.parse(location.dataset.state!)).toEqual({ email: "tony@clutch.test" });
  });

  it("mostra os quatro serviços e os parceiros", () => {
    loginAs(null);
    renderAt(<HomePage />);

    for (const title of ["Spots", "Encontros", "Market", "Comunidade"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    for (const partner of ["SLS", "CSB", "World Skate", "Vans"]) {
      expect(screen.getByAltText(partner)).toBeInTheDocument();
    }
  });

  it("deixa a aba do navegador só com o nome do site", () => {
    loginAs(null);
    renderAt(<HomePage />);
    expect(document.title).toBe("Clutch");
  });
});

describe("Página não encontrada", () => {
  it("mostra o endereço que não existe e o caminho de volta", () => {
    renderAt(<NotFoundPage />, { path: "*", route: "/pagina-que-nao-existe" });

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("/pagina-que-nao-existe", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para a home" })).toHaveAttribute("href", "/");
    expect(document.title).toBe("Página não encontrada | Clutch");
  });
});

describe("Configurações: trocar senha", () => {
  // A seção de senha é o formulário que tem o botão "Trocar senha"
  const section = () => within(screen.getByRole("heading", { name: "Senha" }).closest("section")!);
  const fill = async (current: string, next: string, confirm: string) => {
    if (current) await userEvent.type(section().getByLabelText("Senha atual"), current);
    if (next) await userEvent.type(section().getByLabelText(/^Nova senha/), next);
    if (confirm) await userEvent.type(section().getByLabelText("Confirmar nova senha"), confirm);
  };
  const submit = () => userEvent.click(section().getByRole("button", { name: "Trocar senha" }));

  beforeEach(() => {
    loginAs(makeUser());
    renderAt(<AccountSettingsPage />, { path: "/conta" });
  });

  it("pede a senha atual", async () => {
    await fill("", "novasenha1", "novasenha1");
    await submit();

    expect(section().getByRole("alert")).toHaveTextContent("Informe a senha atual.");
    expect(service.changePassword).not.toHaveBeenCalled();
  });

  it("recusa nova senha curta ou diferente da confirmação", async () => {
    await fill("skate1234", "curta", "curta");
    await submit();
    expect(section().getByRole("alert")).toHaveTextContent("pelo menos 8 caracteres");

    await userEvent.clear(section().getByLabelText(/^Nova senha/));
    await userEvent.clear(section().getByLabelText("Confirmar nova senha"));
    await fill("", "novasenha1", "novasenha2");
    await submit();
    expect(section().getByRole("alert")).toHaveTextContent("As senhas não são iguais.");

    expect(service.changePassword).not.toHaveBeenCalled();
  });

  it("troca a senha, guarda o login novo e limpa os campos", async () => {
    const response = { user: makeUser(), token: "token-novo" };
    service.changePassword.mockResolvedValue(response);
    await fill("skate1234", "novasenha1", "novasenha1");

    await submit();

    await waitFor(() => expect(signIn).toHaveBeenCalledWith(response));
    expect(service.changePassword).toHaveBeenCalledWith("skate1234", "novasenha1");
    expect(section().getByRole("status")).toHaveTextContent("Senha alterada");
    expect(section().getByLabelText("Senha atual")).toHaveValue("");
  });

  it("avisa quando a senha atual está errada", async () => {
    service.changePassword.mockRejectedValue(new ApiError("Senha atual incorreta", 401, [], "WRONG_PASSWORD"));
    await fill("errada123", "novasenha1", "novasenha1");

    await submit();

    expect(await section().findByRole("alert")).toHaveTextContent("Senha incorreta.");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("deixa a aba do navegador com o nome da página", () => {
    expect(document.title).toBe("Configurações | Clutch");
  });
});
