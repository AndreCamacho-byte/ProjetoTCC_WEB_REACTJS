import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/market", () => ({
  marketService: { listBrands: vi.fn() },
  adminMarketService: {
    listProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    addImage: vi.fn(),
    deleteImage: vi.fn(),
    createBrand: vi.fn(),
    deleteBrand: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { adminMarketService, marketService } from "@/services/market";
import { makeUser, renderAt } from "@/test/helpers";
import type { Product } from "@/types/market";
import { AdminProductsPage } from "./AdminProductsPage";

const admin = vi.mocked(adminMarketService);
const brand = { id: "b1", name: "Clutch", description: null, website: null };

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Shape Maple",
    description: "Shape leve",
    price: 199.9,
    active: true,
    category: "SHAPE",
    details: [],
    faq: [],
    location: null,
    brand: { id: "b1", name: "Clutch" },
    images: [],
    variants: [{ id: "v1", size: "Único", stock: 4 }],
    createdAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: makeUser({ role: "ADMIN" }),
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
  });
  vi.mocked(marketService.listBrands).mockResolvedValue([brand]);
  admin.listProducts.mockResolvedValue({ products: [], total: 0, page: 1, pageSize: 12 });
});

async function openNewProduct() {
  renderAt(<AdminProductsPage />, { path: "/admin/produtos" });
  await userEvent.click(await screen.findByRole("button", { name: "Novo produto" }));
  return screen.getByRole("dialog", { name: "Novo produto" });
}

describe("Painel: cadastro de produto", () => {
  it("produto sem tamanho: só o estoque, salvo como tamanho único", async () => {
    admin.createProduct.mockResolvedValue(makeProduct());
    const dialog = await openNewProduct();

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Nome" }), "Shape Maple");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Preço (R$)" }), "199,90");
    await userEvent.type(within(dialog).getByRole("textbox", { name: /Descrição/ }), "Shape leve");
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Tipo de produto" }), "SHAPE");
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /Este produto tem tamanhos/ }));
    expect(within(dialog).queryByRole("textbox", { name: "Tamanho 1" })).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Estoque" }), "4");
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar produto" }));

    await waitFor(() => expect(admin.createProduct).toHaveBeenCalled());
    expect(admin.createProduct.mock.calls[0][0]).toMatchObject({
      category: "SHAPE",
      variants: [{ size: "Único", stock: 4 }],
      // Os campos do modelo sem valor não vão
      details: [],
      location: null,
    });
  });

  it("o tipo escolhido traz o modelo da ficha, e só as linhas preenchidas são salvas", async () => {
    admin.createProduct.mockResolvedValue(makeProduct());
    const dialog = await openNewProduct();

    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Tipo de produto" }), "SKATE_MONTADO");
    const labels = within(dialog)
      .getAllByRole("textbox", { name: /Nome do detalhe/ })
      .map((input) => (input as HTMLInputElement).value);
    expect(labels).toEqual(["Shape", "Rodas", "Rolamento", "Lixa"]);

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Valor do detalhe 2" }), "53mm 99A");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Nome" }), "Skate completo");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Preço (R$)" }), "399");
    await userEvent.type(within(dialog).getByRole("textbox", { name: /Descrição/ }), "Pronto para andar");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Tamanho 1" }), "8.0");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Estoque do tamanho 1" }), "2");
    await userEvent.click(within(dialog).getByRole("button", { name: "+ Adicionar pergunta" }));
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Pergunta 1" }), "Vem montado?");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Resposta 1" }), "Sim");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Local (opcional)" }), "Pinheiros, São Paulo");
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar produto" }));

    await waitFor(() => expect(admin.createProduct).toHaveBeenCalled());
    expect(admin.createProduct.mock.calls[0][0]).toMatchObject({
      category: "SKATE_MONTADO",
      details: [{ label: "Rodas", value: "53mm 99A" }],
      faq: [{ question: "Vem montado?", answer: "Sim" }],
      location: "Pinheiros, São Paulo",
      variants: [{ size: "8.0", stock: 2 }],
    });
  });

  it("não deixa usar o nome reservado do tamanho único como tamanho", async () => {
    const dialog = await openNewProduct();

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Nome" }), "Boné");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Preço (R$)" }), "80");
    await userEvent.type(within(dialog).getByRole("textbox", { name: /Descrição/ }), "Boné aba reta");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Tamanho 1" }), "único");
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Estoque do tamanho 1" }), "3");
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar produto" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("reservado para produtos sem tamanho");
    expect(admin.createProduct).not.toHaveBeenCalled();
  });

  it("ao editar um produto sem tamanho, abre com a opção de tamanhos desmarcada", async () => {
    admin.listProducts.mockResolvedValue({ products: [makeProduct()], total: 1, page: 1, pageSize: 12 });
    renderAt(<AdminProductsPage />, { path: "/admin/produtos" });

    expect(await screen.findByText("Estoque: 4")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog", { name: "Editar produto" });

    expect(within(dialog).getByRole("checkbox", { name: /Este produto tem tamanhos/ })).not.toBeChecked();
    expect(within(dialog).getByRole("textbox", { name: "Estoque" })).toHaveValue("4");
  });
});
