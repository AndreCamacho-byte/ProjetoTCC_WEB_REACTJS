export type Brand = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
};

export type ProductImage = { id: string; url: string };

// Um tamanho do produto, com o seu estoque
export type ProductVariant = { id: string; size: string; stock: number };

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  // Produtos desativados não aparecem na loja (só no painel do administrador)
  active: boolean;
  brand: Pick<Brand, "id" | "name">;
  images: ProductImage[];
  variants: ProductVariant[];
  createdAt: string;
};

export type ProductPage = { products: Product[]; total: number; page: number; pageSize: number };

export type CartItem = {
  variantId: string;
  quantity: number;
  size: string;
  stock: number;
  unitPrice: number;
  subtotal: number;
  // Falso quando o produto saiu da loja ou o estoque não cobre mais a quantidade
  available: boolean;
  product: { id: string; name: string; brandName: string; imageUrl: string | null };
};

export type Cart = { items: CartItem[]; total: number; count: number };

export type Address = {
  recipientName: string;
  zipCode: string;
  street: string;
  addressNumber: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
};

export type OrderStatus = "PENDENTE" | "PAGO" | "ENVIADO" | "ENTREGUE" | "CANCELADO";

export type Order = {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  address: Address;
  items: {
    id: string;
    productName: string;
    brandName: string;
    size: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

// No painel do administrador, cada pedido vem com o cliente
export type AdminOrder = Order & { customer: { name: string; email: string } };
export type AdminOrderPage = { orders: AdminOrder[]; total: number; page: number; pageSize: number };

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  brandId: string;
  active: boolean;
  variants: { size: string; stock: number }[];
};
