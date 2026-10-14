import type { User } from "@/types/user";
import { api } from "./api";

// No painel, as pessoas aparecem pelo nome e pelo @: o email não vem do servidor
export type AdminUser = Omit<User, "email">;
export type UserPage = { users: AdminUser[]; total: number; page: number; pageSize: number };

export type UserUpdate = {
  name?: string;
  username?: string;
  role?: User["role"];
  emailVerified?: boolean;
  // AAAA-MM-DD, ou null para apagar
  birthDate?: string | null;
  // true suspende (a pessoa não entra e some da comunidade); false libera
  suspended?: boolean;
};

// Rotas exclusivas de administradores (o backend recusa com 403 se a conta não for admin)
export const adminService = {
  listUsers: ({ search = "", page = 1 }: { search?: string; page?: number }) => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    return api<UserPage>(`/admin/users?${params}`);
  },

  updateUser: (id: string, data: UserUpdate) => api<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: data }),

  deleteUser: (id: string) => api<null>(`/admin/users/${id}`, { method: "DELETE" }),
};
