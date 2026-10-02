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

export function validateBirthDate(birthDate: string) {
  if (!birthDate) return "Informe sua data de nascimento";
  if (birthDate > todayIso()) return "A data não pode estar no futuro";
  if (birthDate < "1900-01-01") return "Informe uma data válida";
}

// Hoje no formato AAAA-MM-DD (o mesmo do campo de data), no fuso do navegador
export function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function validateNewPassword(password: string) {
  if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres";
}

// Converte o erro da API em uma mensagem para mostrar no formulário
export function getErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Algo deu errado. Tente novamente.";

  if (error.code === "EMAIL_NOT_VERIFIED") return "Confirme seu email antes de entrar.";
  // Para o código de 6 dígitos, o backend já manda a mensagem certa (incorreto, vencido ou muitas tentativas)
  if (error.code === "INVALID_CODE" || error.code === "TOO_MANY_ATTEMPTS") return error.message;
  // Limite de tentativas: o servidor já diz em quanto tempo dá para tentar de novo
  if (error.code === "RATE_LIMITED") return error.message;
  if (error.code === "SESSION_EXPIRED") return "Sua sessão foi encerrada. Entre de novo.";
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
