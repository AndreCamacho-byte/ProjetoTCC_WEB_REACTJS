import { ApiError } from "@/services/api";

export type FormErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mesmas regras do backend (src/controllers/auth.controller.ts), para avisar antes de enviar
export function validateName(name: string) {
  if (name.trim().length < 2) return "Enter your name";
}

export function validateEmail(email: string) {
  if (!email.trim()) return "Enter your email";
  if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email";
}

export function validateNewPassword(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters";
}

// Converte o erro da API em uma mensagem para mostrar no formulário
export function getErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";

  switch (error.status) {
    case 0:
      return error.message;
    case 401:
      return "Wrong email or password";
    case 409:
      return "This email is already registered";
    case 503:
      return "Our servers are taking a break. Try again in a moment.";
    default:
      return "Something went wrong. Try again.";
  }
}
