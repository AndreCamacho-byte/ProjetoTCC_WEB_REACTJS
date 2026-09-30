import { ApiError } from "@/services/api";

export type FormErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mesmas regras do backend (src/controllers/auth.controller.ts), para avisar antes de enviar
export function validateName(name: string) {
  if (name.trim().length < 2) return "Informe seu nome";
}

export function validateEmail(email: string) {
  if (!email.trim()) return "Informe seu email";
  if (!EMAIL_REGEX.test(email.trim())) return "Informe um email válido";
}

export function validateNewPassword(password: string) {
  if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres";
}

// Converte o erro da API em uma mensagem para mostrar no formulário
export function getErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Algo deu errado. Tente novamente.";

  if (error.code === "EMAIL_NOT_VERIFIED") return "Confirme seu email antes de entrar.";
  if (error.code === "INVALID_TOKEN") return "Este link é inválido ou expirou. Peça um novo email de confirmação.";

  switch (error.status) {
    case 0:
      return error.message;
    case 401:
      return "Email ou senha incorretos";
    case 409:
      return "Este email já está cadastrado";
    case 503:
      return "Nossos servidores estão fora do ar. Tente de novo em instantes.";
    default:
      return "Algo deu errado. Tente novamente.";
  }
}
