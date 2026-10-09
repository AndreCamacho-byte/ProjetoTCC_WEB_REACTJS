import type {
  Address,
  AdminOrderPage,
  Brand,
  Cart,
  Order,
  OrderStatus,
  Product,
  ProductImage,
  ProductInput,
  ProductPage,
} from "@/types/market";
import { api } from "./api";

type ListParams = { search?: string; brandId?: string; page?: number };

function listQuery({ search, brandId, page = 1 }: ListParams) {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);
  if (brandId) params.set("brandId", brandId);
  return params;
}

// Loja: o catálogo é público; carrinho e pedidos exigem login (e 12 anos ou mais)
export const marketService = {
  listProducts: (params: ListParams = {}) => api<ProductPage>(`/products?${listQuery(params)}`),
  getProduct: (id: string) => api<Product>(`/products/${id}`),
  listBrands: () => api<Brand[]>("/brands"),

  getCart: () => api<Cart>("/cart"),
  // A quantidade enviada substitui a que estava no carrinho
  setCartItem: (variantId: string, quantity: number) =>
    api<Cart>("/cart/items", { method: "PUT", body: { variantId, quantity } }),
  removeCartItem: (variantId: string) => api<Cart>(`/cart/items/${variantId}`, { method: "DELETE" }),

  // O pagamento é simulado: nada é cobrado
  createOrder: (address: Address) => api<Order>("/orders", { method: "POST", body: address }),
  listOrders: () => api<Order[]>("/orders"),
  getOrder: (id: string) => api<Order>(`/orders/${id}`),
};

// Administração da loja (o backend recusa com 403 se a conta não for admin)
export const adminMarketService = {
  listProducts: (params: ListParams = {}) => api<ProductPage>(`/admin/products?${listQuery(params)}`),
  createProduct: (data: ProductInput) => api<Product>("/admin/products", { method: "POST", body: data }),
  updateProduct: (id: string, data: Partial<ProductInput>) =>
    api<Product>(`/admin/products/${id}`, { method: "PATCH", body: data }),
  deleteProduct: (id: string) => api<null>(`/admin/products/${id}`, { method: "DELETE" }),

  // A foto vai como data URL em JPEG (veja utils/image.ts)
  addImage: (productId: string, image: string) =>
    api<ProductImage>(`/admin/products/${productId}/images`, { method: "POST", body: { image } }),
  deleteImage: (imageId: string) => api<null>(`/admin/products/images/${imageId}`, { method: "DELETE" }),

  createBrand: (name: string) => api<Brand>("/admin/brands", { method: "POST", body: { name } }),
  deleteBrand: (id: string) => api<null>(`/admin/brands/${id}`, { method: "DELETE" }),

  listOrders: ({ status, page = 1 }: { status?: OrderStatus; page?: number }) => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    return api<AdminOrderPage>(`/admin/orders?${params}`);
  },
  updateOrderStatus: (id: string, status: OrderStatus) =>
    api<Order>(`/admin/orders/${id}`, { method: "PATCH", body: { status } }),
};
