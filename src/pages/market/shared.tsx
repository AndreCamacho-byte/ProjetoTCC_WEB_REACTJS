import type { OrderStatus } from "@/types/market";
import { ORDER_STATUS_LABEL } from "@/utils/format";
import styles from "./Market.module.css";

// Foto do produto. Sem foto, mostra a inicial da marca.
export function ProductPhoto({ url, name, brandName }: { url: string | null | undefined; name: string; brandName: string }) {
  return (
    <div className={styles.photo}>
      {url ? (
        <img src={url} alt={name} loading="lazy" />
      ) : (
        <span className={styles.noPhoto} aria-hidden>
          {brandName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

type StepperProps = { value: number; max: number; disabled?: boolean; onChange: (value: number) => void };

// Botões de menos e mais para a quantidade
export function Stepper({ value, max, disabled = false, onChange }: StepperProps) {
  return (
    <div className={styles.stepper}>
      <button type="button" aria-label="Diminuir quantidade" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span aria-label="Quantidade">{value}</span>
      <button type="button" aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={styles.status} data-status={status}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

// Máximo de unidades do mesmo item no carrinho (a mesma regra existe no backend)
export const MAX_PER_ITEM = 10;
