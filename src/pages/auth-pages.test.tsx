import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/auth", () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    verifyCode: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { authService } from "@/services/auth";
import { makeUser, renderAt } from "@/test/helpers";
import { CheckEmailPage } from "./CheckEmailPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

const service = vi.mocked(authService);
const signIn = vi.fn();

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, signIn, signOut: vi.fn(), updateUser: vi.fn() });
});

const currentPath = () => screen.getByTestId("location").textContent;
const currentState = () => JSON.parse(screen.getByTestId("location").dataset.state ?? "null");
const field = (label: string) => screen.getByLabelText(label);
// O campo de data não aceita digitação letra a letra no navegador simulado: o valor é definido de uma vez
const setDate = (label: string, value: string) => fireEvent.change(field(label), { target: { value } });

describe("Cadastro", () => {
  async function fillValid() {
    await userEvent.type(field("Nome"), "Tony Teste");
    await userEvent.type(field("Email"), "tony@clutch.test");
    setDate("Data de nascimento", "2000-01-15");
    await userEvent.type(field("Senha"), "skate1234");
    await userEvent.type(field("Confirmar senha"), "skate1234");
  }
  const submit = () => userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

  it("mostra os cinco campos", () => {
    renderAt(<RegisterPage />);
    for (const label of ["Nome", "Email", "Data de nascimento", "Senha", "Confirmar senha"]) {
      expect(field(label)).toBeInTheDocument();
    }
  });

  it("não envia nada e aponta os campos vazios", async () => {
    renderAt(<RegisterPage />);

    await submit();

    expect(screen.getByText("Informe seu nome")).toBeInTheDocument();
    expect(screen.getByText("Informe seu email")).toBeInTheDocument();
    expect(screen.getByText("Informe sua data de nascimento")).toBeInTheDocument();
    expect(screen.getByText("A senha precisa ter pelo menos 8 caracteres")).toBeInTheDocument();
    expect(service.register).not.toHaveBeenCalled();
  });

  it("recusa quando a confirmação da senha é diferente", async () => {
    renderAt(<RegisterPage />);
    await fillValid();
    await userEvent.clear(field("Confirmar senha"));
    await userEvent.type(field("Confirmar senha"), "skate12345");

    await submit();

    expect(screen.getByText("As senhas não são iguais")).toBeInTheDocument();
    expect(service.register).not.toHaveBeenCalled();
  });

  it("recusa data de nascimento no futuro", async () => {
    renderAt(<RegisterPage />);
    await fillValid();
    setDate("Data de nascimento", "2999-01-01");

    await submit();

    expect(screen.getByText("A data não pode estar no futuro")).toBeInTheDocument();
    expect(service.register).not.toHaveBeenCalled();
  });

  it("apaga o erro do campo quando a pessoa volta a digitar nele", async () => {
    renderAt(<RegisterPage />);
    await submit();
    expect(screen.getByText("Informe seu nome")).toBeInTheDocument();

    await userEvent.type(field("Nome"), "T");

    expect(screen.queryByText("Informe seu nome")).not.toBeInTheDocument();
  });

  it("cadastra e leva para a tela do código, sem mandar a confirmação da senha para o servidor", async () => {
    service.register.mockResolvedValue({ email: "tony@clutch.test", message: "ok" });
    renderAt(<RegisterPage />, { path: "/register" });
    await fillValid();

    await submit();

    await waitFor(() => expect(currentPath()).toBe("/verifique-email"));
    expect(service.register).toHaveBeenCalledWith({
      name: "Tony Teste",
      email: "tony@clutch.test",
      birthDate: "2000-01-15",
      password: "skate1234",
    });
    expect(currentState()).toEqual({ email: "tony@clutch.test", justSent: true });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("avisa quando o email já tem conta", async () => {
    service.register.mockRejectedValue(new ApiError("Este email já está cadastrado", 409));
    renderAt(<RegisterPage />);
    await fillValid();

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Este email já está cadastrado");
    expect(currentPath()).toBe("/");
  });

  it("já vem com o email preenchido quando a pessoa veio do formulário da home", () => {
    renderAt(<RegisterPage />, { state: { email: "veio@clutch.test" } });
    expect(field("Email")).toHaveValue("veio@clutch.test");
  });
});

describe("Login", () => {
  async function fill(email = "tony@clutch.test", password = "skate1234") {
    await userEvent.type(field("Email"), email);
    await userEvent.type(field("Senha"), password);
  }
  const submit = () => userEvent.click(screen.getByRole("button", { name: "Entrar" }));

  it("valida os campos antes de chamar o servidor", async () => {
    renderAt(<LoginPage />);

    await submit();

    expect(screen.getByText("Informe seu email")).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha")).toBeInTheDocument();
    expect(service.login).not.toHaveBeenCalled();
  });

  it("entra e vai para a home", async () => {
    const response = { user: makeUser(), token: "tok" };
    service.login.mockResolvedValue(response);
    renderAt(<LoginPage />, { path: "/login" });
    await fill();

    await submit();

    await waitFor(() => expect(currentPath()).toBe("/"));
    expect(service.login).toHaveBeenCalledWith({ email: "tony@clutch.test", password: "skate1234" });
    expect(signIn).toHaveBeenCalledWith(response);
  });

  it("depois de entrar, volta para a página protegida que a pessoa tentou abrir", async () => {
    service.login.mockResolvedValue({ user: makeUser(), token: "tok" });
    renderAt(<LoginPage />, { path: "/login", state: { from: "/conta" } });
    await fill();

    await submit();

    await waitFor(() => expect(currentPath()).toBe("/conta"));
  });

  it("mostra o erro de email ou senha incorretos e continua na tela", async () => {
    service.login.mockRejectedValue(new ApiError("Email ou senha incorretos", 401));
    renderAt(<LoginPage />, { path: "/login" });
    await fill();

    await submit();

    expect(await screen.findByText("Email ou senha incorretos")).toBeInTheDocument();
    expect(currentPath()).toBe("/login");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("para conta não confirmada, mostra o aviso com o caminho para digitar o código e reenviar", async () => {
    service.login.mockRejectedValue(new ApiError("Confirme seu email", 403, [], "EMAIL_NOT_VERIFIED"));
    renderAt(<LoginPage />, { path: "/login" });
    await fill();

    await submit();

    expect(await screen.findByText(/Confirme seu email antes de entrar/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Digitar o código" })).toHaveAttribute("href", "/verifique-email");
    expect(screen.getByRole("button", { name: "Reenviar email" })).toBeEnabled();
  });

  it("mostra o aviso vindo de outra tela, como depois de redefinir a senha", () => {
    renderAt(<LoginPage />, { state: { message: "Senha alterada! Entre com a nova senha." } });
    expect(screen.getByRole("status")).toHaveTextContent("Senha alterada!");
  });

  it("tem os links de esqueci minha senha, criar conta e política de privacidade", () => {
    renderAt(<LoginPage />);
    expect(screen.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/esqueci-senha");
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "/privacidade");
  });
});

describe("Confira seu email (código de 6 dígitos)", () => {
  const code = () => field("Código de confirmação");
  const submit = () => userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  const fromRegister = { state: { email: "tony@clutch.test", justSent: true } };

  it("mostra para qual email o código foi enviado", () => {
    renderAt(<CheckEmailPage />, fromRegister);
    expect(screen.getByText("tony@clutch.test")).toBeInTheDocument();
  });

  it("aceita só números no código, no máximo 6", async () => {
    renderAt(<CheckEmailPage />, fromRegister);

    await userEvent.type(code(), "12 3a-45678");

    expect(code()).toHaveValue("123456");
  });

  it("não envia código incompleto", async () => {
    renderAt(<CheckEmailPage />, fromRegister);
    await userEvent.type(code(), "123");

    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent("Digite os 6 dígitos do código.");
    expect(service.verifyCode).not.toHaveBeenCalled();
  });

  it("com o código certo, entra na conta e vai para a home", async () => {
    const response = { user: makeUser(), token: "tok" };
    service.verifyCode.mockResolvedValue(response);
    renderAt(<CheckEmailPage />, { path: "/verifique-email", ...fromRegister });
    await userEvent.type(code(), "123456");

    await submit();

    await waitFor(() => expect(currentPath()).toBe("/"));
    expect(service.verifyCode).toHaveBeenCalledWith("tony@clutch.test", "123456");
    expect(signIn).toHaveBeenCalledWith(response);
  });

  it("mostra a mensagem do servidor quando o código está errado", async () => {
    service.verifyCode.mockRejectedValue(new ApiError("Código incorreto. Confira o email.", 400, [], "INVALID_CODE"));
    renderAt(<CheckEmailPage />, fromRegister);
    await userEvent.type(code(), "000000");

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Código incorreto. Confira o email.");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("pede também o email quando a pessoa chega sem vir do cadastro", () => {
    renderAt(<CheckEmailPage />);
    expect(field("Email")).toBeInTheDocument();
  });
});

describe("Esqueci minha senha", () => {
  const submit = () => userEvent.click(screen.getByRole("button", { name: "Enviar link" }));

  it("valida o email", async () => {
    renderAt(<ForgotPasswordPage />);
    await userEvent.type(field("Email da conta"), "nao-e-email");

    await submit();

    expect(screen.getByText("Informe um email válido")).toBeInTheDocument();
    expect(service.forgotPassword).not.toHaveBeenCalled();
  });

  it("pede o link e mostra a confirmação, sem dizer se a conta existe", async () => {
    service.forgotPassword.mockResolvedValue({ message: "ok" });
    renderAt(<ForgotPasswordPage />);
    await userEvent.type(field("Email da conta"), "  tony@clutch.test ");

    await submit();

    expect(await screen.findByRole("heading", { name: "Confira seu email" })).toBeInTheDocument();
    expect(service.forgotPassword).toHaveBeenCalledWith("tony@clutch.test");
    expect(screen.getByText(/Se existir uma conta com o email/)).toBeInTheDocument();
  });

  it("mostra o erro quando o servidor está fora do ar", async () => {
    service.forgotPassword.mockRejectedValue(new ApiError("x", 503));
    renderAt(<ForgotPasswordPage />);
    await userEvent.type(field("Email da conta"), "tony@clutch.test");

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Nossos servidores estão fora do ar");
  });
});

describe("Criar nova senha", () => {
  const submit = () => userEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
  const withToken = { path: "/redefinir-senha", route: "/redefinir-senha?token=meu-token" };

  it("avisa quando o link veio sem o token", () => {
    renderAt(<ResetPasswordPage />, { path: "/redefinir-senha" });
    expect(screen.getByRole("heading", { name: "Link incompleto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedir novo link" })).toHaveAttribute("href", "/esqueci-senha");
  });

  it("exige senhas iguais e com 8 caracteres", async () => {
    renderAt(<ResetPasswordPage />, withToken);
    await userEvent.type(field("Nova senha"), "1234567");
    await userEvent.type(field("Confirmar nova senha"), "7654321");

    await submit();

    expect(screen.getByText("A senha precisa ter pelo menos 8 caracteres")).toBeInTheDocument();
    expect(screen.getByText("As senhas não são iguais")).toBeInTheDocument();
    expect(service.resetPassword).not.toHaveBeenCalled();
  });

  it("troca a senha com o token do link e leva para o login com o aviso", async () => {
    service.resetPassword.mockResolvedValue({ message: "ok" });
    renderAt(<ResetPasswordPage />, withToken);
    await userEvent.type(field("Nova senha"), "novasenha1");
    await userEvent.type(field("Confirmar nova senha"), "novasenha1");

    await submit();

    await waitFor(() => expect(currentPath()).toBe("/login"));
    expect(service.resetPassword).toHaveBeenCalledWith("meu-token", "novasenha1");
    expect(currentState()).toEqual({ message: "Senha alterada! Entre com a nova senha." });
  });

  it("avisa quando o link já expirou e oferece pedir outro", async () => {
    service.resetPassword.mockRejectedValue(new ApiError("Link inválido", 400, [], "INVALID_TOKEN"));
    renderAt(<ResetPasswordPage />, withToken);
    await userEvent.type(field("Nova senha"), "novasenha1");
    await userEvent.type(field("Confirmar nova senha"), "novasenha1");

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Este link é inválido ou já expirou");
    expect(screen.getByRole("link", { name: "Pedir novo link" })).toBeInTheDocument();
  });
});
