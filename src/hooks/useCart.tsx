import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { marketService } from "@/services/market";
import type { Cart } from "@/types/market";
import { ageStatus } from "@/utils/age";
import { useAuth } from "./useAuth";

type CartContextValue = {
  // null = ainda não carregou, ou a pessoa não tem carrinho (deslogada / idade não liberada)
  cart: Cart | null;
  // As rotas do carrinho já devolvem o carrinho atualizado: basta guardar a resposta
  setCart: (cart: Cart) => void;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue>({ cart: null, setCart: () => {}, refresh: async () => {} });

// Guarda o carrinho de quem está logado, para o número no cabeçalho acompanhar as telas da loja
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const canBuy = user !== null && ageStatus(user) === "OK";

  const refresh = useCallback(async () => {
    if (!canBuy) return setCart(null);
    try {
      setCart(await marketService.getCart());
    } catch {
      // O número do cabeçalho é só um atalho: se falhar, a tela do carrinho mostra o erro
    }
  }, [canBuy]);

  useEffect(() => {
    refresh();
  }, [refresh, user?.id]);

  return <CartContext.Provider value={{ cart, setCart, refresh }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
