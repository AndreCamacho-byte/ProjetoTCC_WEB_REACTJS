import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useCart", () => ({ useCart: () => ({ count: 0 }) }));
vi.mock("@/services/account", () => ({ accountService: { updateProfile: vi.fn() } }));
vi.mock("@/services/chat", () => ({
  CHAT_READ_EVENT: "clutch:chat-read",
  chatService: { unreadCount: vi.fn() },
}));

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { accountService } from "@/services/account";
import { chatService } from "@/services/chat";
import { makeUser } from "@/test/helpers";
import { Avatar } from "./Avatar";
import { SiteHeader } from "./SiteHeader";
import { UsernameGate } from "./UsernameGate";

const signOut = vi.fn();
const updateUser = vi.fn();
const loggedAs = (overrides = {}) =>
  vi.mocked(useAuth).mockReturnValue({ user: makeUser(overrides), loading: false, signIn: vi.fn(), signOut, updateUser });

beforeEach(() => {
  loggedAs();
  // O cabeçalho pergunta as mensagens não lidas
  vi.mocked(chatService.unreadCount).mockResolvedValue({ count: 0 });
});

describe("escolher o @username (contas antigas)", () => {
  it("não aparece para quem já escolheu", () => {
    render(<UsernameGate />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aparece para conta com o @ gerado pelo email e salva o novo", async () => {
    loggedAs({ username: "tonyhawk", usernameChosen: false });
    const updated = makeUser({ username: "tony_sk8", usernameChosen: true });
    vi.mocked(accountService.updateProfile).mockResolvedValue(updated);
    render(<UsernameGate />);

    expect(screen.getByRole("dialog", { name: "Escolha seu @username" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Novo @username"), "Tony_Sk8");
    await userEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));

    expect(accountService.updateProfile).toHaveBeenCalledWith({ username: "tony_sk8" });
    expect(updateUser).toHaveBeenCalledWith(updated);
  });

  it("não aceita manter o @ atual, que veio do email", async () => {
    loggedAs({ username: "tonyhawk", usernameChosen: false });
    render(<UsernameGate />);

    await userEvent.type(screen.getByLabelText("Novo @username"), "tonyhawk");
    await userEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("diferente do atual");
    expect(accountService.updateProfile).not.toHaveBeenCalled();
  });

  it("mostra quando o @ já é de outra pessoa", async () => {
    loggedAs({ username: "tonyhawk", usernameChosen: false });
    vi.mocked(accountService.updateProfile).mockRejectedValue(new ApiError("Este @username já está em uso", 409));
    render(<UsernameGate />);

    await userEvent.type(screen.getByLabelText("Novo @username"), "ocupado");
    await userEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("já está em uso");
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe("sair da conta", () => {
  const openMenu = async () => {
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Menu da conta" }));
  };

  it("pede confirmação e só sai se a pessoa confirmar", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await openMenu();

    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(confirm).toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(signOut).toHaveBeenCalledOnce();
  });
});

describe("foto de perfil", () => {
  it("fica sempre redonda, sem ser espremida pela largura do espaço", () => {
    render(<Avatar user={{ name: "Tony", avatarUrl: "/foto.jpg" }} size={88} />);
    const img = document.querySelector("img")!;

    expect(img.style.width).toBe("88px");
    expect(img.style.height).toBe("88px");
    expect(img.style.minWidth).toBe("88px");
    expect(img.style.maxWidth).toBe("none");
  });
});
