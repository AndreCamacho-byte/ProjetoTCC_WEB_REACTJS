import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useCart", () => ({ useCart: vi.fn() }));
vi.mock("@/services/market", () => ({
  marketService: {
    listProducts: vi.fn(),
    getProduct: vi.fn(),
    listBrands: vi.fn(),
    getCart: vi.fn(),
    setCartItem: vi.fn(),
    removeCartItem: vi.fn(),
    createOrder: vi.fn(),
    listOrders: vi.fn(),
    getOrder: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { ApiError } from "@/services/api";
import { marketService } from "@/services/market";
import { makeUser, renderAt } from "@/test/helpers";
import type { Cart, CartItem, Order, Product } from "@/types/market";
import type { User } from "@/types/user";
import { CartPage } from "./CartPage";
import { CheckoutPage, validateAddress } from "./CheckoutPage";
import { MarketPage } from "./MarketPage";
import { OrderPage, OrdersPage } from "./OrdersPage";
import { ProductPage } from "./ProductPage";

const service = vi.mocked(marketService);
const setCart = vi.fn();
const refresh = vi.fn();

const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
const ORDER_ID = "66666666-6666-4666-8666-666666666666";

function loginAs(user: User | null) {
  vi.mocked(useAuth).mockReturnValue({ user, loading: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() });
}

function withCart(cart: Cart | null) {
  vi.mocked(useCart).mockReturnValue({ cart, setCart, refresh });
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: PRODUCT_ID,
    name: "Camiseta Clutch Logo",
    description: "Algodão pesado, corte reto.",
    price: 119.9,
    active: true,
    brand: { id: "brand-1", name: "Clutch" },
    images: [],
    variants: [
      { id: "variant-p", size: "P", stock: 0 },
      { id: "variant-m", size: "M", stock: 5 },
      { id: "variant-g", size: "G", stock: 2 },
    ],
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    variantId: "variant-m",
    quantity: 2,
    size: "M",
    stock: 5,
    unitPrice: 119.9,
    subtotal: 239.8,
    available: true,
    product: { id: PRODUCT_ID, name: "Camiseta Clutch Logo", brandName: "Clutch", imageUrl: null },
    ...overrides,
  };
}

const makeCart = (items: CartItem[] = [makeItem()]): Cart => ({
  items,
  total: items.reduce((sum, item) => sum + item.subtotal, 0),
  count: items.reduce((sum, item) => sum + item.quantity, 0),
});

const order: Order = {
  id: ORDER_ID,
  status: "PAGO",
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
  items: [
    { id: "item-1", productName: "Camiseta Clutch Logo", brandName: "Clutch", size: "M", quantity: 2, unitPrice: 119.9, subtotal: 239.8 },
  ],
};

const currentPath = () => screen.getByTestId("location").textContent;
const page = (products: Product[], total = products.length) => ({ products, total, page: 1, pageSize: 12 });

beforeEach(() => {
  loginAs(makeUser());
  withCart(makeCart([]));
  service.listBrands.mockResolvedValue([]);
});

describe("Vitrine", () => {
  it("mostra os produtos com marca e preço", async () => {
    service.listProducts.mockResolvedValue(page([makeProduct()]));
    renderAt(<MarketPage />, { path: "/market" });

    const link = await screen.findByRole("link", { name: /Camiseta Clutch Logo/ });
    expect(link).toHaveAttribute("href", `/market/produto/${PRODUCT_ID}`);
    expect(within(link).getByText(/119,90/)).toBeInTheDocument();
    expect(within(link).queryByText("Esgotado")).not.toBeInTheDocument();
  });

  it("marca como esgotado o produto sem estoque em nenhum tamanho", async () => {
    service.listProducts.mockResolvedValue(page([makeProduct({ variants: [{ id: "v", size: "M", stock: 0 }] })]));
    renderAt(<MarketPage />, { path: "/market" });

    expect(await screen.findByText("Esgotado")).toBeInTheDocument();
  });

  it("busca pelo texto que veio no endereço e pelo que a pessoa digita", async () => {
    service.listProducts.mockResolvedValue(page([]));
    renderAt(<MarketPage />, { path: "/market", route: "/market?busca=moletom" });

    await waitFor(() => expect(service.listProducts).toHaveBeenCalledWith({ search: "moletom", brandId: "", page: 1 }));
    expect(await screen.findByText("Nenhum produto encontrado com esse filtro.")).toBeInTheDocument();

    const input = screen.getByRole("searchbox", { name: "Buscar na loja" });
    await userEvent.clear(input);
    await userEvent.type(input, "  boné {Enter}");

    await waitFor(() => expect(service.listProducts).toHaveBeenLastCalledWith({ search: "boné", brandId: "", page: 1 }));
  });

  it("filtra por marca quando há mais de uma", async () => {
    service.listBrands.mockResolvedValue([
      { id: "brand-1", name: "Clutch", description: null, website: null },
      { id: "brand-2", name: "Outra", description: null, website: null },
    ]);
    service.listProducts.mockResolvedValue(page([makeProduct()]));
    renderAt(<MarketPage />, { path: "/market" });

    await userEvent.click(await screen.findByRole("button", { name: "Outra" }));

    await waitFor(() => expect(service.listProducts).toHaveBeenLastCalledWith({ search: "", brandId: "brand-2", page: 1 }));
  });

  it("avisa quando a loja está vazia e quando o servidor falha", async () => {
    service.listProducts.mockResolvedValue(page([]));
    const { unmount } = renderAt(<MarketPage />, { path: "/market" });
    expect(await screen.findByText(/ainda não tem produtos/)).toBeInTheDocument();
    unmount();

    service.listProducts.mockRejectedValue(new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.", 0));
    renderAt(<MarketPage />, { path: "/market" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível conectar");
  });

  it("pagina quando há mais produtos do que cabem na tela", async () => {
    service.listProducts.mockResolvedValue(page([makeProduct()], 30));
    renderAt(<MarketPage />, { path: "/market" });

    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));

    await waitFor(() => expect(service.listProducts).toHaveBeenLastCalledWith({ search: "", brandId: "", page: 2 }));
  });
});

describe("Página do produto", () => {
  const open = () => renderAt(<ProductPage />, { path: "/market/produto/:id", route: `/market/produto/${PRODUCT_ID}` });

  it("mostra os dados e bloqueia o tamanho esgotado", async () => {
    service.getProduct.mockResolvedValue(makeProduct());
    open();

    expect(await screen.findByRole("heading", { name: "Camiseta Clutch Logo" })).toBeInTheDocument();
    expect(screen.getByText("Algodão pesado, corte reto.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P (esgotado)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "M" })).toBeEnabled();
  });

  it("pede para escolher o tamanho antes de adicionar", async () => {
    service.getProduct.mockResolvedValue(makeProduct());
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Adicionar ao carrinho" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Escolha um tamanho.");
    expect(service.setCartItem).not.toHaveBeenCalled();
  });

  it("adiciona o tamanho e a quantidade escolhidos", async () => {
    service.getProduct.mockResolvedValue(makeProduct());
    service.setCartItem.mockResolvedValue(makeCart());
    open();

    await userEvent.click(await screen.findByRole("button", { name: "M" }));
    await userEvent.click(screen.getByRole("button", { name: "Aumentar quantidade" }));
    await userEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }));

    await waitFor(() => expect(service.setCartItem).toHaveBeenCalledWith("variant-m", 2));
    expect(setCart).toHaveBeenCalledWith(makeCart());
    expect(await screen.findByRole("status")).toHaveTextContent("Adicionado ao carrinho");
    expect(screen.getByRole("link", { name: "Ver carrinho" })).toHaveAttribute("href", "/market/carrinho");
  });

  it("soma com o que já estava no carrinho", async () => {
    withCart(makeCart([makeItem({ variantId: "variant-g", size: "G", quantity: 1, stock: 2 })]));
    service.getProduct.mockResolvedValue(makeProduct());
    service.setCartItem.mockResolvedValue(makeCart());
    open();

    await userEvent.click(await screen.findByRole("button", { name: "G" }));
    // Estoque 2 e 1 já no carrinho: só cabe mais 1
    expect(screen.getByRole("button", { name: "Aumentar quantidade" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }));

    await waitFor(() => expect(service.setCartItem).toHaveBeenCalledWith("variant-g", 2));
  });

  it("não deixa passar do estoque quando tudo já está no carrinho", async () => {
    withCart(makeCart([makeItem({ variantId: "variant-g", size: "G", quantity: 2, stock: 2 })]));
    service.getProduct.mockResolvedValue(makeProduct());
    open();

    await userEvent.click(await screen.findByRole("button", { name: "G" }));

    expect(screen.getByRole("button", { name: "Adicionar ao carrinho" })).toBeDisabled();
    expect(screen.getByText(/máximo disponível deste tamanho/)).toBeInTheDocument();
  });

  it("mostra o aviso do servidor quando o estoque acaba no meio do caminho", async () => {
    service.getProduct.mockResolvedValue(makeProduct());
    service.setCartItem.mockRejectedValue(new ApiError("Este tamanho está esgotado", 409, [], "OUT_OF_STOCK"));
    open();

    await userEvent.click(await screen.findByRole("button", { name: "M" }));
    await userEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Este tamanho está esgotado");
  });

  it("manda o visitante para o login, lembrando de onde ele veio", async () => {
    loginAs(null);
    withCart(null);
    service.getProduct.mockResolvedValue(makeProduct());
    open();

    await userEvent.click(await screen.findByRole("button", { name: "M" }));
    await userEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }));

    expect(currentPath()).toBe("/login");
    expect(JSON.parse(screen.getByTestId("location").dataset.state ?? "null")).toEqual({ from: `/market/produto/${PRODUCT_ID}` });
    expect(service.setCartItem).not.toHaveBeenCalled();
  });

  it("produto esgotado não pode ser adicionado", async () => {
    service.getProduct.mockResolvedValue(makeProduct({ variants: [{ id: "v", size: "M", stock: 0 }] }));
    open();

    expect(await screen.findByRole("button", { name: "Esgotado" })).toBeDisabled();
  });

  it("avisa quando o produto não existe mais", async () => {
    service.getProduct.mockRejectedValue(new ApiError("Produto não encontrado", 404));
    open();

    expect(await screen.findByText("Este produto não está mais disponível.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para a loja" })).toHaveAttribute("href", "/market");
  });
});

describe("Carrinho", () => {
  const open = () => renderAt(<CartPage />, { path: "/market/carrinho" });

  it("convida a ver a loja quando está vazio", async () => {
    service.getCart.mockResolvedValue(makeCart([]));
    open();

    expect(await screen.findByText("Seu carrinho está vazio.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Finalizar compra" })).not.toBeInTheDocument();
  });

  it("mostra os itens, o total e o caminho para finalizar", async () => {
    withCart(makeCart());
    service.getCart.mockResolvedValue(makeCart());
    open();

    expect(await screen.findByRole("link", { name: "Camiseta Clutch Logo" })).toBeInTheDocument();
    expect(screen.getByText("2 itens")).toBeInTheDocument();
    expect(screen.getAllByText(/239,80/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Finalizar compra" })).toHaveAttribute("href", "/market/finalizar");
  });

  it("muda a quantidade e remove o item", async () => {
    withCart(makeCart());
    service.getCart.mockResolvedValue(makeCart());
    service.setCartItem.mockResolvedValue(makeCart());
    service.removeCartItem.mockResolvedValue(makeCart([]));
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Aumentar quantidade" }));
    await waitFor(() => expect(service.setCartItem).toHaveBeenCalledWith("variant-m", 3));

    await userEvent.click(screen.getByRole("button", { name: "Tirar Camiseta Clutch Logo do carrinho" }));
    await waitFor(() => expect(service.removeCartItem).toHaveBeenCalledWith("variant-m"));
    expect(setCart).toHaveBeenLastCalledWith(makeCart([]));
  });

  it("trava a compra quando um item ficou sem estoque", async () => {
    const cart = makeCart([makeItem({ quantity: 4, stock: 1, available: false })]);
    withCart(cart);
    service.getCart.mockResolvedValue(cart);
    open();

    expect(await screen.findByText("Só resta 1 unidade")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalizar compra" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Finalizar compra" })).not.toBeInTheDocument();
  });
});

describe("Finalizar compra", () => {
  const open = () => renderAt(<CheckoutPage />, { path: "/market/finalizar" });

  const address = {
    recipientName: "Tony Teste",
    zipCode: "01310-100",
    street: "Avenida Paulista",
    addressNumber: "1000",
    complement: "",
    district: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  };

  async function fill() {
    await userEvent.type(await screen.findByLabelText("CEP"), "01310100");
    await userEvent.type(screen.getByLabelText("Rua"), address.street);
    await userEvent.type(screen.getByLabelText("Número"), address.addressNumber);
    await userEvent.type(screen.getByLabelText("Bairro"), address.district);
    await userEvent.type(screen.getByLabelText("Cidade"), address.city);
    await userEvent.selectOptions(screen.getByLabelText("Estado"), "SP");
  }

  beforeEach(() => {
    withCart(makeCart());
    service.getCart.mockResolvedValue(makeCart());
  });

  it("confere o endereço", () => {
    expect(validateAddress(address)).toEqual({});
    expect(Object.keys(validateAddress({ ...address, zipCode: "123", state: "", city: " " })).sort()).toEqual(["city", "state", "zipCode"]);
  });

  it("deixa claro que o pagamento é simulado", async () => {
    open();
    expect(await screen.findByText("Pagamento simulado.")).toBeInTheDocument();
    expect(screen.getByText(/nenhum valor é cobrado/)).toBeInTheDocument();
  });

  it("não envia com o endereço incompleto", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar pedido" }));

    expect(screen.getByText("O CEP tem 8 dígitos")).toBeInTheDocument();
    expect(screen.getByText("Informe a rua")).toBeInTheDocument();
    expect(screen.getByText("Escolha o estado")).toBeInTheDocument();
    expect(service.createOrder).not.toHaveBeenCalled();
  });

  it("já traz o nome da conta e coloca o traço do CEP", async () => {
    open();
    expect(await screen.findByLabelText("Nome de quem vai receber")).toHaveValue("Tony Teste");

    await userEvent.type(screen.getByLabelText("CEP"), "01310100");
    expect(screen.getByLabelText("CEP")).toHaveValue("01310-100");
  });

  it("fecha o pedido e leva para a confirmação", async () => {
    service.createOrder.mockResolvedValue(order);
    open();
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    await waitFor(() => expect(service.createOrder).toHaveBeenCalledWith({ ...address, complement: undefined }));
    expect(refresh).toHaveBeenCalled();
    await waitFor(() => expect(currentPath()).toBe(`/market/pedidos/${ORDER_ID}`));
  });

  it("mostra o motivo quando o servidor recusa por falta de estoque", async () => {
    service.createOrder.mockRejectedValue(new ApiError('Não há estoque suficiente de "Camiseta Clutch Logo"', 409, [], "OUT_OF_STOCK"));
    open();
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não há estoque suficiente");
    expect(currentPath()).toBe("/market/finalizar");
  });

  it("volta para o carrinho quando não há o que comprar", async () => {
    withCart(makeCart([]));
    service.getCart.mockResolvedValue(makeCart([]));
    open();

    await waitFor(() => expect(currentPath()).toBe("/market/carrinho"));
  });
});

describe("Pedidos", () => {
  it("lista os pedidos com situação e total", async () => {
    service.listOrders.mockResolvedValue([order]);
    renderAt(<OrdersPage />, { path: "/market/pedidos" });

    const link = await screen.findByRole("link", { name: /Pedido #66666666/ });
    expect(link).toHaveAttribute("href", `/market/pedidos/${ORDER_ID}`);
    expect(within(link).getByText("Pago")).toBeInTheDocument();
    expect(within(link).getByText(/2 itens/)).toHaveTextContent("239,80");
  });

  it("avisa quem ainda não comprou nada", async () => {
    service.listOrders.mockResolvedValue([]);
    renderAt(<OrdersPage />, { path: "/market/pedidos" });

    expect(await screen.findByText("Você ainda não fez nenhum pedido.")).toBeInTheDocument();
  });

  it("mostra os itens e o endereço do pedido", async () => {
    service.getOrder.mockResolvedValue(order);
    renderAt(<OrderPage />, { path: "/market/pedidos/:id", route: `/market/pedidos/${ORDER_ID}` });

    expect(await screen.findByRole("heading", { name: "Pedido #66666666" })).toBeInTheDocument();
    expect(screen.getByText(/2× Camiseta Clutch Logo/)).toBeInTheDocument();
    expect(screen.getByText(/Avenida Paulista, 1000/)).toBeInTheDocument();
    expect(screen.getByText(/CEP 01310-100/)).toBeInTheDocument();
    expect(screen.queryByText("Pedido confirmado!")).not.toBeInTheDocument();
  });

  it("logo depois da compra, confirma que nada foi cobrado", async () => {
    service.getOrder.mockResolvedValue(order);
    renderAt(<OrderPage />, {
      path: "/market/pedidos/:id",
      route: `/market/pedidos/${ORDER_ID}`,
      state: { justCreated: true },
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Pedido confirmado! Como o pagamento é simulado, nada foi cobrado.");
  });

  it("não mostra pedido que não é da pessoa", async () => {
    service.getOrder.mockRejectedValue(new ApiError("Pedido não encontrado", 404));
    renderAt(<OrderPage />, { path: "/market/pedidos/:id", route: `/market/pedidos/${ORDER_ID}` });

    expect(await screen.findByRole("alert")).toHaveTextContent("Pedido não encontrado.");
  });
});
