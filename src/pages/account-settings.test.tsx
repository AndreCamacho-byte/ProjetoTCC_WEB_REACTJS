import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
    forgetDevices: vi.fn(),
  },
}));
vi.mock("@/services/moderation", () => ({
  moderationService: { listBlocked: vi.fn(), unblock: vi.fn() },
}));
// Recortar a foto usa o canvas do navegador, que não existe nos testes
vi.mock("@/utils/image", () => ({
  fileToAvatar: vi.fn(async () => "data:image/jpeg;base64,AAAA"),
}));

import { useAuth } from "@/hooks/useAuth";
import { accountService } from "@/services/account";
import { ApiError } from "@/services/api";
import { moderationService } from "@/services/moderation";
import { makeUser, renderAt } from "@/test/helpers";
import type { User } from "@/types/user";
import { AccountSettingsPage } from "./AccountSettingsPage";

const service = vi.mocked(accountService);
const updateUser = vi.fn();
const signOut = vi.fn();

function open(user: User = makeUser()) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    loading: false,
    signIn: vi.fn(),
    signOut,
    updateUser,
  });
  renderAt(<AccountSettingsPage />, { path: "/conta" });
}

// Cada parte da tela é um <section> com um título
const section = (title: string) => within(screen.getByRole("heading", { name: title }).closest("section")!);

beforeEach(() => {
  vi.mocked(moderationService.listBlocked).mockResolvedValue([]);
});

describe("Configurações: foto de perfil", () => {
  it("envia a foto escolhida e avisa", async () => {
    const updated = makeUser({ avatarUrl: "/api/users/1/avatar?v=2" });
    service.setAvatar.mockResolvedValue(updated);
    open();

    const file = new File(["foto"], "eu.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Escolher foto de perfil"), file);

    expect(service.setAvatar).toHaveBeenCalledWith("data:image/jpeg;base64,AAAA");
    expect(updateUser).toHaveBeenCalledWith(updated);
    expect(await section("Foto de perfil").findByRole("status")).toHaveTextContent("Foto atualizada.");
  });

  it("sem foto não mostra o botão de remover; com foto, remove", async () => {
    open();
    expect(section("Foto de perfil").queryByRole("button", { name: "Remover" })).not.toBeInTheDocument();
    expect(section("Foto de perfil").getByRole("button", { name: "Escolher foto" })).toBeInTheDocument();
  });

  it("remove a foto atual", async () => {
    service.removeAvatar.mockResolvedValue(makeUser());
    open(makeUser({ avatarUrl: "/api/users/1/avatar" }));

    await userEvent.click(section("Foto de perfil").getByRole("button", { name: "Remover" }));

    expect(service.removeAvatar).toHaveBeenCalled();
    expect(await section("Foto de perfil").findByRole("status")).toHaveTextContent("Foto removida.");
  });

  it("mostra o erro quando o envio falha", async () => {
    service.setAvatar.mockRejectedValue(new ApiError("A foto passou de 600 KB", 400));
    open();

    await userEvent.upload(
      screen.getByLabelText("Escolher foto de perfil"),
      new File(["x"], "eu.png", { type: "image/png" }),
    );

    expect(await section("Foto de perfil").findByRole("alert")).toHaveTextContent("A foto passou de 600 KB");
  });
});

describe("Configurações: seus dados", () => {
  const save = () => section("Seus dados").getByRole("button", { name: "Salvar alterações" });

  it("o botão só libera quando algo mudou, e manda só o que mudou", async () => {
    service.updateProfile.mockImplementation(async (data) => makeUser({ ...data, bio: data.bio ?? null }));
    open();
    expect(save()).toBeDisabled();

    await userEvent.type(section("Seus dados").getByLabelText(/^Bio/), "Street todo dia");
    await userEvent.selectOptions(section("Seus dados").getByLabelText("Nível de skate"), "AVANCADO");
    await userEvent.click(save());

    expect(service.updateProfile).toHaveBeenCalledWith({
      bio: "Street todo dia",
      skateLevel: "AVANCADO",
    });
    expect(await section("Seus dados").findByRole("status")).toHaveTextContent("Dados salvos.");
  });

  it("confere o @username antes de enviar", async () => {
    open();
    const field = section("Seus dados").getByLabelText(/Nome de usuário/);
    await userEvent.clear(field);
    await userEvent.type(field, "ab");
    await userEvent.click(save());

    expect(section("Seus dados").getByRole("alert")).toHaveTextContent("de 3 a 20 letras minúsculas");
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  it("mostra quando o @ já é de outra pessoa", async () => {
    service.updateProfile.mockRejectedValue(new ApiError("Esse @username já está em uso", 409));
    open();
    const field = section("Seus dados").getByLabelText(/Nome de usuário/);
    await userEvent.clear(field);
    await userEvent.type(field, "outro_nome");
    await userEvent.click(save());

    expect(await section("Seus dados").findByRole("alert")).toHaveTextContent("Esse @username já está em uso");
  });

  it("o email aparece só para a própria pessoa e não pode ser editado", () => {
    open();
    expect(section("Seus dados").getByLabelText(/^Email/)).toHaveValue("tony@clutch.test");
    expect(section("Seus dados").getByLabelText(/^Email/)).toBeDisabled();
  });
});

describe("Configurações: idade", () => {
  it("conta com data mostra a idade verificada, sem formulário", () => {
    open();
    expect(section("Idade").getByText("Verificada")).toBeInTheDocument();
    expect(section("Idade").queryByLabelText("Data de nascimento")).not.toBeInTheDocument();
  });

  it("conta antiga sem data informa uma vez", async () => {
    service.setBirthDate.mockResolvedValue(makeUser());
    open(makeUser({ birthDate: null }));

    expect(section("Idade").getByText("Não verificada")).toBeInTheDocument();
    fireEvent.change(section("Idade").getByLabelText(/^Data de nascimento/), {
      target: { value: "2000-01-15" },
    });
    await userEvent.click(
      section("Idade").getByRole("button", {
        name: "Salvar data de nascimento",
      }),
    );

    expect(service.setBirthDate).toHaveBeenCalledWith("2000-01-15");
    await waitFor(() => expect(updateUser).toHaveBeenCalled());
  });

  it("recusa data de menor de 13 anos sem chamar o servidor", async () => {
    open(makeUser({ birthDate: null }));
    const young = new Date();
    young.setFullYear(young.getFullYear() - 10);

    fireEvent.change(section("Idade").getByLabelText(/^Data de nascimento/), {
      target: { value: young.toISOString().slice(0, 10) },
    });
    await userEvent.click(
      section("Idade").getByRole("button", {
        name: "Salvar data de nascimento",
      }),
    );

    expect(section("Idade").getByRole("alert")).toHaveTextContent("maiores de 13 anos");
    expect(service.setBirthDate).not.toHaveBeenCalled();
  });
});

describe("Configurações: aparelhos lembrados", () => {
  it("pede confirmação e diz quantos aparelhos foram esquecidos", async () => {
    service.forgetDevices.mockResolvedValue({ forgotten: 2 });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    open();
    const button = section("Aparelhos lembrados").getByRole("button", {
      name: "Esquecer todos os aparelhos",
    });

    await userEvent.click(button);
    expect(service.forgetDevices).not.toHaveBeenCalled();

    await userEvent.click(button);
    expect(await section("Aparelhos lembrados").findByRole("status")).toHaveTextContent("2 aparelhos esquecidos");
    confirm.mockRestore();
  });
});

describe("Configurações: excluir conta", () => {
  const dialog = () => within(screen.getByRole("dialog", { name: "Excluir conta" }));

  it("pede a senha antes de excluir", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    await userEvent.click(dialog().getByRole("button", { name: "Excluir para sempre" }));

    expect(dialog().getByRole("alert")).toHaveTextContent("Digite sua senha para confirmar.");
    expect(service.deleteAccount).not.toHaveBeenCalled();
  });

  it("senha errada mostra o erro e a conta continua", async () => {
    service.deleteAccount.mockRejectedValue(new ApiError("Senha atual incorreta", 401, [], "WRONG_PASSWORD"));
    open();
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    await userEvent.type(dialog().getByLabelText("Senha"), "errada123");
    await userEvent.click(dialog().getByRole("button", { name: "Excluir para sempre" }));

    expect(await dialog().findByRole("alert")).toHaveTextContent("Senha incorreta");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("com a senha certa, exclui e sai da conta", async () => {
    service.deleteAccount.mockResolvedValue(null);
    const replace = vi.fn();
    vi.stubGlobal("location", { ...window.location, replace });
    open();
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    await userEvent.type(dialog().getByLabelText("Senha"), "certa1234");
    await userEvent.click(dialog().getByRole("button", { name: "Excluir para sempre" }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(service.deleteAccount).toHaveBeenCalledWith("certa1234");
    expect(replace).toHaveBeenCalledWith("/");
    vi.unstubAllGlobals();
  });

  it("cancelar fecha a janela", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    await userEvent.click(dialog().getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Configurações: pessoas bloqueadas", () => {
  it("lista e desbloqueia", async () => {
    vi.mocked(moderationService.listBlocked).mockResolvedValue([
      {
        id: "u2",
        name: "Leticia",
        username: "leti",
        avatarUrl: null,
        skateLevel: null,
      },
    ]);
    vi.mocked(moderationService.unblock).mockResolvedValue({
      blockedByMe: false,
    } as never);
    open();

    await userEvent.click(
      await section("Pessoas bloqueadas").findByRole("button", {
        name: "Desbloquear",
      }),
    );

    expect(moderationService.unblock).toHaveBeenCalledWith("leti");
    await waitFor(() => expect(section("Pessoas bloqueadas").queryByText("Leticia")).not.toBeInTheDocument());
  });
});
