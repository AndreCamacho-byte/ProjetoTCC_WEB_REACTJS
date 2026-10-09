import { useCallback, useEffect, useState } from "react";
import { AdminTabs } from "@/components/AdminTabs";
import { usePageTitle } from "@/hooks/usePageTitle";
import { adminMarketService } from "@/services/market";
import type { AdminOrder, AdminOrderPage, OrderStatus } from "@/types/market";
import { ORDER_STATUS_LABEL, formatBRL, formatCep, formatDate, orderNumber } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import { StatusBadge } from "./market/shared";
import styles from "./AdminUsersPage.module.css";

// Para onde cada pedido pode ir (a mesma regra existe no backend, em order.service.ts)
const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDENTE: ["PAGO", "CANCELADO"],
  PAGO: ["ENVIADO", "CANCELADO"],
  ENVIADO: ["ENTREGUE", "CANCELADO"],
  ENTREGUE: [],
  CANCELADO: [],
};

const ACTION_LABEL: Record<OrderStatus, string> = {
  PENDENTE: "Marcar como pendente",
  PAGO: "Marcar como pago",
  ENVIADO: "Marcar como enviado",
  ENTREGUE: "Marcar como entregue",
  CANCELADO: "Cancelar pedido",
};

// Painel do administrador: pedidos de todos os clientes
export function AdminOrdersPage() {
  usePageTitle("Pedidos · Painel admin");

  const [data, setData] = useState<AdminOrderPage | null>(null);
  const [query, setQuery] = useState<{ status?: OrderStatus; page: number }>({ page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminMarketService.listOrders(query));
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(order: AdminOrder, status: OrderStatus) {
    if (status === "CANCELADO" && !window.confirm(`Cancelar o pedido ${orderNumber(order.id)}? Os itens voltam para o estoque.`)) {
      return;
    }
    setBusyId(order.id);
    setError("");
    try {
      await adminMarketService.updateOrderStatus(order.id, status);
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className={styles.page}>
      <AdminTabs />
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Administração</p>
          <h1 className={styles.title}>Pedidos</h1>
        </div>
        <div className={styles.headerActions}>
          <select
            className={styles.select}
            aria-label="Filtrar por situação"
            value={query.status ?? ""}
            onChange={(e) => setQuery({ status: (e.target.value || undefined) as OrderStatus | undefined, page: 1 })}
          >
            <option value="">Todas as situações</option>
            {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Entrega</th>
              <th>Total</th>
              <th>Situação</th>
              <th>
                <span className={styles.srOnly}>Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{orderNumber(order.id)}</strong>
                  <span className={styles.handle}>{formatDate(order.createdAt)}</span>
                </td>
                <td>
                  {order.customer.name}
                  <span className={styles.handle}>{order.customer.email}</span>
                </td>
                <td>
                  <ul className={styles.orderItems}>
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity}× {item.productName} ({item.size})
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  {order.address.recipientName}
                  <span className={styles.handle}>
                    {order.address.street}, {order.address.addressNumber}
                    {order.address.complement ? ` · ${order.address.complement}` : ""} · {order.address.district}
                  </span>
                  <span className={styles.handle}>
                    {order.address.city}/{order.address.state} · CEP {formatCep(order.address.zipCode)}
                  </span>
                </td>
                <td>{formatBRL(order.total)}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td className={styles.actions}>
                  {NEXT_STATUS[order.status].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={status === "CANCELADO" ? styles.dangerButton : styles.linkButton}
                      disabled={busyId === order.id}
                      onClick={() => changeStatus(order, status)}
                    >
                      {ACTION_LABEL[status]}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
            {data && data.orders.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
            {!data && loading && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <footer className={styles.footer}>
          <span>
            {data.total} {data.total === 1 ? "pedido" : "pedidos"}
          </span>
          <div className={styles.pagination}>
            <button type="button" disabled={data.page <= 1 || loading} onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}>
              Anterior
            </button>
            <span>
              Página {data.page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= totalPages || loading}
              onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
            >
              Próxima
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
