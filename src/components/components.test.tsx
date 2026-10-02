import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { FormAlert } from "./FormAlert";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("liga o rótulo ao campo", () => {
    render(<TextField label="Email" type="email" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("mostra a mensagem de erro e marca o campo como inválido", () => {
    render(<TextField label="Email" error="Informe um email válido" />);

    const input = screen.getByLabelText("Email");
    expect(screen.getByText("Informe um email válido")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Informe um email válido");
  });

  it("não marca como inválido quando não há erro", () => {
    render(<TextField label="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("avisa cada tecla digitada", async () => {
    const onChange = vi.fn();
    render(<TextField label="Nome" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Nome"), "Tony");

    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it("campo de senha começa oculto e alterna com o botão do olho", async () => {
    render(<TextField label="Senha" type="password" />);
    const input = screen.getByLabelText("Senha");

    expect(input).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(input).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("só o campo de senha tem o botão do olho", () => {
    render(<TextField label="Email" type="email" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Button", () => {
  it("mostra o texto e chama a ação ao clicar", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Entrar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("enquanto carrega fica desativado e não aceita cliques", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Entrar
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Carregando")).toBeInTheDocument();
    expect(screen.queryByText("Entrar")).not.toBeInTheDocument();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respeita o disabled", () => {
    render(<Button disabled>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});

describe("FormAlert", () => {
  it("anuncia a mensagem como alerta", () => {
    render(<FormAlert>Email ou senha incorretos</FormAlert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Email ou senha incorretos");
  });
});

describe("Avatar", () => {
  it("sem foto, mostra a inicial do nome em maiúscula", () => {
    render(<Avatar user={{ name: "tony teste", avatarUrl: null }} size={36} />);
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("com foto, mostra a imagem no tamanho pedido", () => {
    render(<Avatar user={{ name: "Tony", avatarUrl: "/api/users/1/avatar?v=1" }} size={96} />);

    const img = document.querySelector("img")!;
    expect(img).toHaveAttribute("src", "/api/users/1/avatar?v=1");
    expect(img).toHaveStyle({ width: "96px", height: "96px" });
    expect(screen.queryByText("T")).not.toBeInTheDocument();
  });
});
