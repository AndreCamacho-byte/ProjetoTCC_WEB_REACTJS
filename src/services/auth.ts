import type { AuthResponse, LoginChallenge, User } from "@/types/user";
import { api } from "./api";

export const authService = {
  // Cria a conta e dispara o email de confirmação (não faz login)
  register: (data: { name: string; username: string; email: string; password: string; birthDate: string }) =>
    api<{ email: string; message: string }>("/auth/register", { method: "POST", body: data }),

  // Primeira etapa do login: confere a senha e manda um código por email (chamar de novo reenvia)
  login: (data: { email: string; password: string }) =>
    api<LoginChallenge>("/auth/login", { method: "POST", body: data }),

  // Segunda etapa: o código do email devolve o login
  verifyLogin: (email: string, code: string) =>
    api<AuthResponse>("/auth/login/verify", { method: "POST", body: { email, code } }),

  // Confirma o email com o token do link e já devolve o login
  verifyEmail: (token: string) => api<AuthResponse>("/auth/verify-email", { method: "POST", body: { token } }),

  // Confirma o email com o código de 6 dígitos e já devolve o login
  verifyCode: (email: string, code: string) =>
    api<AuthResponse>("/auth/verify-code", { method: "POST", body: { email, code } }),

  resendVerification: (email: string) =>
    api<{ message: string }>("/auth/resend-verification", { method: "POST", body: { email } }),

  // Pede o email com o link para criar uma nova senha
  forgotPassword: (email: string) =>
    api<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email } }),

  // Define a nova senha com o token do link recebido por email
  resetPassword: (token: string, password: string) =>
    api<{ message: string }>("/auth/reset-password", { method: "POST", body: { token, password } }),

  me: () => api<User>("/auth/me"),
};
