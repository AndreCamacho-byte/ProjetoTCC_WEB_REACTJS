import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { usePageTitle } from "@/hooks/usePageTitle";
import { marketService } from "@/services/market";
import type { CartItem } from "@/types/market";
import { formatBRL } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Market.module.css";
import { MAX_PER_ITEM, ProductPhoto, Stepper } from "./shared";

export function CartPage() {
  usePageTitle("Carrinho");

  const { cart, setCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Busca de novo ao abrir a tela: o estoque pode ter mudado desde a última vez
  useEffect(() => {
    marketService
      .getCart()
      .then(setCart)
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoading(false));
  }, [setCart]);

  async function run(action: () => ReturnType<typeof marketService.getCart>) {
    setBusy(true);
    setError("");
    try {
      setCart(await action());
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!cart) {
    return (
      <div className={`${styles.page} ${styles.narrow}`}>
        <h1 className={styles.title}>Carrinho</h1>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          loading && <p className={styles.empty}>Carregando...</p>
        )}
      </div>
    );
  }

  const blocked = cart.items.some((item) => !item.available);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Market</p>
          <h1 className={styles.title}>Carrinho</h1>
        </div>
        <Link to="/market/pedidos" className={styles.secondary}>
          Meus pedidos
        </Link>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {cart.items.length === 0 ? (
        <div className={styles.empty}>
          <p>Seu carrinho está vazio.</p>
          <Link to="/market" className={styles.primary}>
            Ver a loja
          </Link>
        </div>
      ) : (
        <div className={styles.split}>
          <ul className={styles.list}>
            {cart.items.map((item) => (
              <CartRow
                key={item.variantId}
                item={item}
                busy={busy}
                onQuantity={(quantity) => run(() => marketService.setCartItem(item.variantId, quantity))}
                onRemove={() => run(() => marketService.removeCartItem(item.variantId))}
              />
            ))}
          </ul>

          <aside className={styles.panel}>
            <h2>Resumo</h2>
            <p className={styles.summaryRow}>
              <span>
                {cart.count} {cart.count === 1 ? "item" : "itens"}
              </span>
              <span>{formatBRL(cart.total)}</span>
            </p>
            <p className={styles.summaryRow}>
              <span>Frete</span>
              <span>Grátis</span>
            </p>
            <p className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total</span>
              <span>{formatBRL(cart.total)}</span>
            </p>
            {blocked ? (
              <>
                <p className={styles.itemWarning}>Ajuste ou tire os itens indisponíveis para continuar.</p>
                <button type="button" className={`${styles.primary} ${styles.block}`} disabled>
                  Finalizar compra
                </button>
              </>
            ) : (
              <Link to="/market/finalizar" className={`${styles.primary} ${styles.block}`}>
                Finalizar compra
              </Link>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

type RowProps = { item: CartItem; busy: boolean; onQuantity: (quantity: number) => void; onRemove: () => void };

function CartRow({ item, busy, onQuantity, onRemove }: RowProps) {
  const { product } = item;

  // Por que o item não pode ser comprado do jeito que está
  const warning = item.available
    ? ""
    : item.stock === 0
      ? "Esgotado"
      : item.stock < item.quantity
        ? `Só ${item.stock === 1 ? "resta 1 unidade" : `restam ${item.stock} unidades`}`
        : "Este produto saiu da loja";

  return (
    <li className={styles.item}>
      <ProductPhoto url={product.imageUrl} name={product.name} brandName={product.brandName} />
      <div>
        <Link to={`/market/produto/${product.id}`} className={styles.itemName}>
          {product.name}
        </Link>
        <p className={styles.itemMeta}>
          {product.brandName} · Tamanho {item.size} · {formatBRL(item.unitPrice)}
        </p>
        {warning && <p className={styles.itemWarning}>{warning}</p>}
        <button type="button" className={styles.textButton} disabled={busy} onClick={onRemove} aria-label={`Tirar ${product.name} do carrinho`}>
          Remover
        </button>
      </div>
      <div className={styles.itemSide}>
        <strong>{formatBRL(item.subtotal)}</strong>
        <Stepper
          value={item.quantity}
          max={Math.min(MAX_PER_ITEM, item.stock)}
          disabled={busy || item.stock === 0}
          // Com estoque menor que a quantidade, o botão de menos leva direto para o que ainda existe
          onChange={(quantity) => onQuantity(Math.min(quantity, Math.max(1, item.stock)))}
        />
      </div>
    </li>
  );
}
