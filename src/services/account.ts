import type { User } from "@/types/user";
import { api } from "./api";

// Configurações da própria conta
export const accountService = {
  updateProfile: (data: { name?: string; username?: string }) =>
    api<User>("/users/me", { method: "PATCH", body: data }),

  // `image` é a foto já recortada, em JPEG (data URL em base64)
  setAvatar: (image: string) => api<User>("/users/me/avatar", { method: "PUT", body: { image } }),

  removeAvatar: () => api<User>("/users/me/avatar", { method: "DELETE" }),

  deleteAccount: (password: string) => api<null>("/users/me", { method: "DELETE", body: { password } }),
};
