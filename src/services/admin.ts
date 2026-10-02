import type { User } from "@/types/user";
import { api } from "./api";

export type UserPage = { users: User[]; total: number; page: number; pageSize: number };

export type UserUpdate = {
  name?: string;
  username?: string;
  role?: User["role"];
  emailVerified?: boolean;
  // AAAA-MM-DD, ou null para apagar
  birthDate?: string | null;
};

// Rotas exclusivas de administradores (o backend recusa com 403 se a conta não for admin)
export const adminService = {
  listUsers: ({ search = "", page = 1 }: { search?: string; page?: number }) => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    return api<UserPage>(`/admin/users?${params}`);
  },

  updateUser: (id: string, data: UserUpdate) => api<User>(`/admin/users/${id}`, { method: "PATCH", body: data }),

  deleteUser: (id: string) => api<null>(`/admin/users/${id}`, { method: "DELETE" }),
};
