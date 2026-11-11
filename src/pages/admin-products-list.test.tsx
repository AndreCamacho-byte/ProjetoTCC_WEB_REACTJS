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
// Preparar a foto usa o canvas do navegador, que não existe nos testes
vi.mock("@/utils/image", () => ({ fileToProductPhoto: vi.fn() }));

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { adminMarketService, marketService } from "@/services/market";
import { makeUser, renderAt } from "@/test/helpers";
import type { Product } from "@/types/market";
import { fileToProductPhoto } from "@/utils/image";
import { AdminProductsPage } from "./AdminProductsPage";

const admin = vi.mocked(adminMarketService);
const brands = [
  { id: "b1", name: "Clutch", description: null, website: null },
  { id: "b2", name: "Blunt", description: null, website: null },
];

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

const page = (products: Product[], total = products.length, pageNumber = 1) => ({
  products,
  total,
  page: pageNumber,
  pageSize: 12,
});

function open() {
  renderAt(<AdminProductsPage />, { path: "/admin/produtos" });
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: makeUser({ role: "ADMIN" }),
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
  });
  vi.mocked(marketService.listBrands).mockResolvedValue(brands);
});

describe("Painel: lista de produtos", () => {
  it("mostra preço, estoque por tamanho, tipo e se está na loja", async () => {
    admin.listProducts.mockResolvedValue(
      page([
        makeProduct(),
        makeProduct({
          id: "p2",
          name: "Camiseta Logo",
          price: 119.9,
          category: "ROUPA",
          active: false,
          variants: [
            { id: "v2", size: "P", stock: 0 },
            { id: "v3", size: "M", stock: 5 },
          ],
        }),
      ]),
    );
    open();

    const shape = (await screen.findByText("Shape Maple")).closest("tr")!;
    expect(within(shape).getByText(/199,90/)).toBeInTheDocument();
    expect(within(shape).getByText("Estoque: 4")).toBeInTheDocument();
    expect(within(shape).getByText("Sim")).toBeInTheDocument();

    const shirt = screen.getByText("Camiseta Logo").closest("tr")!;
    expect(within(shirt).getByText("P: 0 · M: 5")).toBeInTheDocument();
    expect(within(shirt).getByText("Desativado")).toBeInTheDocument();
    expect(screen.getByText("2 produtos")).toBeInTheDocument();
  });

  it("sem produtos, avisa que a loja está vazia", async () => {
    admin.listProducts.mockResolvedValue(page([]));
    open();
    expect(await screen.findByText("Nenhum produto cadastrado.")).toBeInTheDocument();
  });

  it("busca por nome ou marca e volta para a página 1", async () => {
    admin.listProducts.mockResolvedValue(page([makeProduct()]));
    open();
    await screen.findByText("Shape Maple");

    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar produtos" }), "  blunt {Enter}");

    await waitFor(() =>
      expect(admin.listProducts).toHaveBeenLastCalledWith({
        search: "blunt",
        page: 1,
      }),
    );
  });

  it("anda entre as páginas", async () => {
    admin.listProducts.mockImplementation(async (params) => {
      const n = params?.page ?? 1;
      return page([makeProduct({ id: `p${n}` })], 30, n);
    });
    open();

    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));

    expect(await screen.findByText("Página 2 de 3")).toBeInTheDocument();
    expect(admin.listProducts).toHaveBeenLastCalledWith({
      search: "",
      page: 2,
    });
  });

  it("mostra o erro quando a lista não carrega", async () => {
    admin.listProducts.mockRejectedValue(new ApiError("Sem conexão com o servidor", 500));
    open();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("Painel: remover produto", () => {
  it("pede confirmação, remove e recarrega a lista", async () => {
    admin.listProducts.mockResolvedValueOnce(page([makeProduct()])).mockResolvedValue(page([]));
    admin.deleteProduct.mockResolvedValue(null as never);
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Remover" }));
    const dialog = within(screen.getByRole("dialog", { name: "Remover produto" }));
    expect(dialog.getByText("Shape Maple")).toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "Remover" }));

    expect(admin.deleteProduct).toHaveBeenCalledWith("p1");
    expect(await screen.findByText("Nenhum produto cadastrado.")).toBeInTheDocument();
  });

  it("cancelar não remove", async () => {
    admin.listProducts.mockResolvedValue(page([makeProduct()]));
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Remover" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancelar",
      }),
    );

    expect(admin.deleteProduct).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Painel: fotos do produto", () => {
  async function openEdit(product: Product) {
    admin.listProducts.mockResolvedValue(page([product]));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    return within(screen.getByRole("dialog"));
  }

  it("envia a foto e avisa quando ela é pequena", async () => {
    vi.mocked(fileToProductPhoto).mockResolvedValue({
      photo: "data:image/jpeg;base64,AAAA",
      small: true,
    });
    admin.addImage.mockResolvedValue({
      id: "img1",
      url: "/api/products/images/img1",
    });
    const dialog = await openEdit(makeProduct());

    await userEvent.upload(
      dialog.getByLabelText("Escolher foto do produto"),
      new File(["x"], "shape.jpg", { type: "image/jpeg" }),
    );

    expect(admin.addImage).toHaveBeenCalledWith("p1", "data:image/jpeg;base64,AAAA");
    expect(await dialog.findByAltText("Foto 1")).toBeInTheDocument();
    expect(dialog.getByText(/pequena e pode aparecer borrada/)).toBeInTheDocument();
  });

  it("apaga uma foto", async () => {
    admin.deleteImage.mockResolvedValue(null as never);
    const dialog = await openEdit(
      makeProduct({
        images: [{ id: "img1", url: "/api/products/images/img1" }],
      }),
    );

    await userEvent.click(dialog.getByRole("button", { name: "Apagar foto 1" }));

    expect(admin.deleteImage).toHaveBeenCalledWith("img1");
    await waitFor(() => expect(dialog.queryByAltText("Foto 1")).not.toBeInTheDocument());
  });

  it("com 5 fotos, não deixa colocar outra", async () => {
    const images = Array.from({ length: 5 }, (_, i) => ({
      id: `img${i}`,
      url: `/api/products/images/img${i}`,
    }));
    const dialog = await openEdit(makeProduct({ images }));

    expect(dialog.getByText("Fotos (5/5)")).toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: "+ Foto" })).not.toBeInTheDocument();
  });

  it("produto novo só recebe foto depois de salvo", async () => {
    admin.listProducts.mockResolvedValue(page([]));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Novo produto" }));

    expect(
      within(screen.getByRole("dialog")).getByText("Salve o produto para poder colocar as fotos."),
    ).toBeInTheDocument();
  });
});

describe("Painel: marcas", () => {
  it("adiciona e apaga marcas", async () => {
    admin.listProducts.mockResolvedValue(page([]));
    admin.createBrand.mockResolvedValue({
      id: "b3",
      name: "Drop Dead",
      description: null,
      website: null,
    } as never);
    admin.deleteBrand.mockResolvedValue(null as never);
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Marcas" }));
    const dialog = within(screen.getByRole("dialog", { name: "Marcas" }));
    expect(await dialog.findByText("Blunt")).toBeInTheDocument();

    await userEvent.type(dialog.getByRole("textbox", { name: "Nome da nova marca" }), "Drop Dead");
    await userEvent.click(dialog.getByRole("button", { name: "Adicionar" }));
    expect(admin.createBrand).toHaveBeenCalledWith("Drop Dead");

    await userEvent.click(dialog.getByRole("button", { name: "Apagar a marca Blunt" }));
    expect(admin.deleteBrand).toHaveBeenCalledWith("b2");
  });

  it("mostra o erro de marca com produtos", async () => {
    admin.listProducts.mockResolvedValue(page([]));
    admin.deleteBrand.mockRejectedValue(new ApiError("Essa marca tem produtos e não pode ser apagada", 409));
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Marcas" }));
    const dialog = within(screen.getByRole("dialog", { name: "Marcas" }));
    await userEvent.click(await dialog.findByRole("button", { name: "Apagar a marca Clutch" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Essa marca tem produtos e não pode ser apagada");
  });
});
