import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useCart", () => ({ useCart: vi.fn() }));
vi.mock("@/services/market", () => ({
  marketService: {
    getProduct: vi.fn(),
    getRelated: vi.fn(),
    listProducts: vi.fn(),
    getSavedProducts: vi.fn(),
    saveProduct: vi.fn(),
    unsaveProduct: vi.fn(),
    setCartItem: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { marketService } from "@/services/market";
import { makeUser, renderAt } from "@/test/helpers";
import type { Product } from "@/types/market";
import { installments, listingDate } from "@/utils/format";
import { ProductPage } from "./ProductPage";
import { getRecentProducts, rememberProduct } from "./recentProducts";

const service = vi.mocked(marketService);
const ID = "22222222-2222-4222-8222-222222222222";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: ID,
    name: "Shape Maple 8.0",
    description: "Shape leve e resistente.",
    price: 45.99,
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

const open = () => renderAt(<ProductPage />, { path: "/market/produto/:id", route: `/market/produto/${ID}` });

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: makeUser(), loading: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() });
  vi.mocked(useCart).mockReturnValue({ cart: { items: [], total: 0, count: 0 }, setCart: vi.fn(), refresh: vi.fn() });
  service.getRelated.mockResolvedValue([]);
  service.getSavedProducts.mockResolvedValue([]);
  service.listProducts.mockResolvedValue({ products: [], total: 0, page: 1, pageSize: 12 });
  localStorage.clear();
});

describe("página do produto no layout novo", () => {
  it("mostra tipo, preço e parcelas em até 3x", async () => {
    service.getProduct.mockResolvedValue(makeProduct({ location: "Santa Cecília, São Paulo" }));
    open();

    expect(await screen.findByRole("heading", { name: "Shape Maple 8.0" })).toBeInTheDocument();
    expect(screen.getByText("Shape")).toBeInTheDocument();
    expect(screen.getByText(/ou 3x de R\$\s15,33 sem juros/)).toBeInTheDocument();
    expect(screen.getByText(/Santa Cecília, São Paulo/)).toBeInTheDocument();
  });

  it("produto sem tamanho não mostra seletor e já pode ir para o carrinho", async () => {
    service.getProduct.mockResolvedValue(makeProduct());
    service.setCartItem.mockResolvedValue({ items: [], total: 0, count: 1 });
    open();

    await screen.findByRole("heading", { name: "Shape Maple 8.0" });
    expect(screen.queryByText("Tamanho")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Único" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }));
    await waitFor(() => expect(service.setCartItem).toHaveBeenCalledWith("v1", 1));
    expect(screen.getByText("Em estoque.")).toBeInTheDocument();
  });

  it("mostra a ficha de detalhes e a descrição completa nas abas", async () => {
    service.getProduct.mockResolvedValue(
      makeProduct({
        description: "Primeiro parágrafo curto.\n\nSegundo parágrafo com mais detalhes da madeira.",
        details: [
          { label: "Madeira", value: "Maple canadense" },
          { label: "Estado", value: "Novo" },
        ],
      }),
    );
    open();

    // Ao lado das fotos fica só o resumo; a aba Descrição (a primeira) traz o texto todo
    expect(await screen.findByText("Primeiro parágrafo curto.")).toBeInTheDocument();
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("Segundo parágrafo com mais detalhes da madeira.");

    await userEvent.click(screen.getByRole("tab", { name: "Detalhes" }));
    expect(within(screen.getByRole("tabpanel")).getByText("Maple canadense")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Entrega e pagamento" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("pagamento é simulado");
  });

  it("sem texto extra nem ficha, só a aba de entrega aparece", async () => {
    service.getProduct.mockResolvedValue(makeProduct());
    open();

    await screen.findByRole("heading", { name: "Shape Maple 8.0" });
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Entrega e pagamento"]);
  });

  it("perguntas do produto vêm antes das perguntas gerais da loja", async () => {
    service.getProduct.mockResolvedValue(makeProduct({ faq: [{ question: "Vem com lixa?", answer: "Sim, já aplicada." }] }));
    open();

    const questions = (await screen.findAllByRole("group")).filter((el) => el.tagName === "DETAILS");
    expect(questions[0]).toHaveTextContent("Vem com lixa?");
    expect(screen.getByText("Como funciona o pagamento?")).toBeInTheDocument();
    expect(screen.getByText("Quanto custa o frete?")).toBeInTheDocument();
  });

  it("selos: frete grátis e compra segura (sem cashback)", async () => {
    service.getProduct.mockResolvedValue(makeProduct());
    open();

    expect(await screen.findByText("Frete grátis")).toBeInTheDocument();
    expect(screen.getByText("Compra segura")).toBeInTheDocument();
    expect(screen.queryByText(/cashback/i)).not.toBeInTheDocument();
  });

  it("mostra os relacionados com tipo, data e local", async () => {
    service.getProduct.mockResolvedValue(makeProduct());
    service.getRelated.mockResolvedValue([
      makeProduct({ id: "outro", name: "Shape Pro 8.25", location: "Pinheiros, São Paulo", createdAt: new Date().toISOString() }),
    ]);
    open();

    const section = await screen.findByRole("region", { name: "Produtos relacionados" });
    const card = within(section).getByRole("link", { name: /Shape Pro 8.25/ });
    expect(card).toHaveAttribute("href", "/market/produto/outro");
    expect(card).toHaveTextContent(/Hoje, \d{2}:\d{2}/);
    expect(card).toHaveTextContent("Pinheiros, São Paulo");
  });

  it("guarda a visita e mostra os produtos vistos antes", async () => {
    rememberProduct("visto-antes");
    service.getProduct.mockResolvedValue(makeProduct());
    service.listProducts.mockResolvedValue({ products: [makeProduct({ id: "visto-antes", name: "Boné Five Panel" })], total: 1, page: 1, pageSize: 12 });
    open();

    const section = await screen.findByRole("region", { name: "Últimas visitas" });
    expect(within(section).getByText("Boné Five Panel")).toBeInTheDocument();
    expect(service.listProducts).toHaveBeenCalledWith({ ids: ["visto-antes"] });
    expect(getRecentProducts()[0]).toBe(ID);
  });

  it("o quadrado preto salva o produto", async () => {
    service.getProduct.mockResolvedValue(makeProduct());
    service.saveProduct.mockResolvedValue({ savedByMe: true });
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("button", { name: "Salvo" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("ajudantes de formato", () => {
  it("parcelas em até 3x sem juros", () => {
    expect(installments(45.99).replace(/ /g, " ")).toBe("ou 3x de R$ 15,33 sem juros");
  });

  it("data do anúncio: hoje, ontem ou a data", () => {
    const now = new Date(2026, 9, 17, 15, 0);
    expect(listingDate(new Date(2026, 9, 17, 11, 9).toISOString(), now)).toBe("Hoje, 11:09");
    expect(listingDate(new Date(2026, 9, 16, 18, 30).toISOString(), now)).toBe("Ontem, 18:30");
    expect(listingDate(new Date(2026, 9, 10, 12, 0).toISOString(), now)).toBe("10/10/2026");
  });

  it("últimas visitas: sem repetir e no máximo 12", () => {
    for (let i = 0; i < 15; i++) rememberProduct(`p${i}`);
    rememberProduct("p3");
    const list = getRecentProducts();
    expect(list).toHaveLength(12);
    expect(list[0]).toBe("p3");
    expect(list.filter((id) => id === "p3")).toHaveLength(1);
  });
});
