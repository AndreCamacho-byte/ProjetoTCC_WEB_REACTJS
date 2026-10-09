import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronLeftIcon } from "@/components/icons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/services/api";
import { marketService } from "@/services/market";
import type { Order } from "@/types/market";
import { formatBRL, formatCep, formatDate, orderNumber } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Market.module.css";
import { StatusBadge } from "./shared";

// Lista dos pedidos de quem está logado
export function OrdersPage() {
  usePageTitle("Meus pedidos");

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    marketService.listOrders().then(setOrders, (err) => setError(apiMessage(err)));
  }, []);

  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Market</p>
          <h1 className={styles.title}>Meus pedidos</h1>
        </div>
        <Link to="/market" className={styles.secondary}>
          Ver a loja
        </Link>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!orders && !error && <p className={styles.empty}>Carregando...</p>}
      {orders?.length === 0 && <p className={styles.empty}>Você ainda não fez nenhum pedido.</p>}

      <ul className={styles.list}>
        {orders?.map((order) => {
          const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
          return (
            <li key={order.id}>
              <Link to={`/market/pedidos/${order.id}`} className={styles.order}>
                <div className={styles.orderTop}>
                  <strong>Pedido {orderNumber(order.id)}</strong>
                  <StatusBadge status={order.status} />
                </div>
                <span className={styles.muted}>
                  {formatDate(order.createdAt)} · {units} {units === 1 ? "item" : "itens"} · {formatBRL(order.total)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Detalhes de um pedido. Logo depois da compra, mostra a confirmação.
export function OrderPage() {
  const { id = "" } = useParams();
  const justCreated = Boolean((useLocation().state as { justCreated?: boolean } | null)?.justCreated);

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  usePageTitle(order ? `Pedido ${orderNumber(order.id)}` : "Pedido");

  useEffect(() => {
    marketService.getOrder(id).then(setOrder, (err) => {
      const missing = err instanceof ApiError && (err.status === 404 || err.status === 400);
      setError(missing ? "Pedido não encontrado." : apiMessage(err));
    });
  }, [id]);

  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <Link to="/market/pedidos" className={styles.backLink}>
        <ChevronLeftIcon size={16} /> Meus pedidos
      </Link>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!order && !error && <p className={styles.empty}>Carregando...</p>}

      {order && (
        <>
          {justCreated && (
            <p className={styles.success} role="status">
              <strong>Pedido confirmado!</strong> Como o pagamento é simulado, nada foi cobrado.
            </p>
          )}

          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>{formatDate(order.createdAt)}</p>
              <h1 className={styles.title}>Pedido {orderNumber(order.id)}</h1>
            </div>
            <StatusBadge status={order.status} />
          </header>

          <section className={styles.panel} style={{ marginBottom: 16 }}>
            <h2>Itens</h2>
            <ul className={styles.orderLines}>
              {order.items.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.quantity}× {item.productName}
                    <small>
                      {item.brandName} · Tamanho {item.size} · {formatBRL(item.unitPrice)} cada
                    </small>
                  </span>
                  <strong>{formatBRL(item.subtotal)}</strong>
                </li>
              ))}
            </ul>
            <p className={`${styles.summaryRow} ${styles.summaryTotal}`} style={{ marginBottom: 0 }}>
              <span>Total</span>
              <span>{formatBRL(order.total)}</span>
            </p>
          </section>

          <section className={styles.panel}>
            <h2>Entrega</h2>
            <address className={styles.address}>
              {order.address.recipientName}
              <br />
              {order.address.street}, {order.address.addressNumber}
              {order.address.complement ? ` · ${order.address.complement}` : ""}
              <br />
              {order.address.district} · {order.address.city}/{order.address.state}
              <br />
              CEP {formatCep(order.address.zipCode)}
            </address>
          </section>
        </>
      )}
    </div>
  );
}
