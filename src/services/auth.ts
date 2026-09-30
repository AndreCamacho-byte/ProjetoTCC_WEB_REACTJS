import type { AuthResponse, User } from "@/types/user";
import { api } from "./api";

export const authService = {
  register: (data: { name: string; email: string; password: string }) =>
    api<AuthResponse>("/auth/register", { method: "POST", body: data }),

  login: (data: { email: string; password: string }) =>
    api<AuthResponse>("/auth/login", { method: "POST", body: data }),

  me: () => api<User>("/auth/me"),
};
