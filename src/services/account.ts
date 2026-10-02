import type { AuthResponse, User } from "@/types/user";
import { api } from "./api";

// Configurações da própria conta
export const accountService = {
  updateProfile: (data: { name?: string; username?: string }) =>
    api<User>("/users/me", { method: "PATCH", body: data }),

  // Troca a senha. A resposta traz um token novo, porque os logins antigos deixam de valer
  changePassword: (currentPassword: string, newPassword: string) =>
    api<AuthResponse>("/users/me/password", { method: "PATCH", body: { currentPassword, newPassword } }),

  // Só para contas antigas, que ainda não têm data de nascimento (formato AAAA-MM-DD)
  setBirthDate: (birthDate: string) => api<User>("/users/me/birth-date", { method: "PUT", body: { birthDate } }),

  // `image` é a foto já recortada, em JPEG (data URL em base64)
  setAvatar: (image: string) => api<User>("/users/me/avatar", { method: "PUT", body: { image } }),

  removeAvatar: () => api<User>("/users/me/avatar", { method: "DELETE" }),

  deleteAccount: (password: string) => api<null>("/users/me", { method: "DELETE", body: { password } }),
};
