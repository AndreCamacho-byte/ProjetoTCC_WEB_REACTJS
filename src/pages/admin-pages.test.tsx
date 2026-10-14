import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/admin", () => ({
  adminService: { listUsers: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn() },
}));
vi.mock("@/services/market", () => ({
  marketService: {},
  adminMarketService: { listOrders: vi.fn(), updateOrderStatus: vi.fn() },
}));

import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services/admin";
import { adminMarketService } from "@/services/market";
import { makeUser, renderAt } from "@/test/helpers";
import { AdminOrdersPage } from "./AdminOrdersPage";
import { AdminUsersPage } from "./AdminUsersPage";

const ADMIN = makeUser({ id: "admin-id", role: "ADMIN", username: "admin" });

// Como o servidor manda as pessoas para o painel: sem email
function adminUser(overrides: Record<string, unknown> = {}) {
  const { email: _, ...user } = makeUser({ id: "user-1", name: "Leticia Teste", username: "leticia", ...overrides });
  return user;
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: ADMIN, loading: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() });
});

describe("Painel: usuários", () => {
  it("mostra as pessoas pelo nome e @, sem coluna de email", async () => {
    vi.mocked(adminService.listUsers).mockResolvedValue({ users: [adminUser()], total: 1, page: 1, pageSize: 20 });
    renderAt(<AdminUsersPage />, { path: "/admin" });

    expect(await screen.findByText("@leticia")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Email" })).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar usuários" })).toHaveAttribute("placeholder", "Buscar por nome ou @");
  });

  it("suspende uma conta pela janela de edição", async () => {
    vi.mocked(adminService.listUsers).mockResolvedValue({ users: [adminUser()], total: 1, page: 1, pageSize: 20 });
    vi.mocked(adminService.updateUser).mockResolvedValue(adminUser({ suspendedAt: "2026-10-15T00:00:00.000Z" }));
    renderAt(<AdminUsersPage />, { path: "/admin" });

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog", { name: "Editar usuário" });
    expect(within(dialog).getByText("@leticia")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /Conta suspensa/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(adminService.updateUser).toHaveBeenCalledWith("user-1", { suspended: true }));
  });

  it("marca as contas suspensas na lista", async () => {
    vi.mocked(adminService.listUsers).mockResolvedValue({
      users: [adminUser({ suspendedAt: "2026-10-15T00:00:00.000Z" })],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    renderAt(<AdminUsersPage />, { path: "/admin" });

    expect(await screen.findByText("Suspensa")).toBeInTheDocument();
  });

  it("não deixa o admin suspender a si mesmo", async () => {
    vi.mocked(adminService.listUsers).mockResolvedValue({
      users: [adminUser({ id: "admin-id", username: "admin", role: "ADMIN" })],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    renderAt(<AdminUsersPage />, { path: "/admin" });

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    expect(screen.getByRole("checkbox", { name: /Conta suspensa/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Remover" })).not.toBeInTheDocument();
  });

  it("pede confirmação antes de remover, mostrando o @", async () => {
    vi.mocked(adminService.listUsers).mockResolvedValue({ users: [adminUser()], total: 1, page: 1, pageSize: 20 });
    vi.mocked(adminService.deleteUser).mockResolvedValue(null);
    renderAt(<AdminUsersPage />, { path: "/admin" });

    await userEvent.click(await screen.findByRole("button", { name: "Remover" }));
    const dialog = screen.getByRole("dialog", { name: "Remover usuário" });
    expect(dialog).toHaveTextContent("(@leticia)");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remover" }));

    await waitFor(() => expect(adminService.deleteUser).toHaveBeenCalledWith("user-1"));
  });
});

describe("Painel: pedidos", () => {
  const order = {
    id: "66666666-6666-4666-8666-666666666666",
    status: "PAGO" as const,
    total: 239.8,
    createdAt: "2026-10-09T15:00:00.000Z",
    address: {
      recipientName: "Tony Teste",
      zipCode: "01310100",
      street: "Avenida Paulista",
      addressNumber: "1000",
      complement: null,
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    },
    items: [{ id: "i1", productName: "Camiseta", brandName: "Clutch", size: "M", quantity: 2, unitPrice: 119.9, subtotal: 239.8 }],
    customer: { name: "Tony Teste", username: "tony" },
  };

  it("mostra o cliente pelo @ e os próximos passos do pedido", async () => {
    vi.mocked(adminMarketService.listOrders).mockResolvedValue({ orders: [order], total: 1, page: 1, pageSize: 20 });
    vi.mocked(adminMarketService.updateOrderStatus).mockResolvedValue({ ...order, status: "ENVIADO" });
    renderAt(<AdminOrdersPage />, { path: "/admin/pedidos" });

    expect(await screen.findByText("@tony")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como entregue" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Marcar como enviado" }));

    await waitFor(() => expect(adminMarketService.updateOrderStatus).toHaveBeenCalledWith(order.id, "ENVIADO"));
  });
});
