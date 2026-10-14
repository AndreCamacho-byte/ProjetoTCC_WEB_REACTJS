import type { OrderStatus } from "@/types/market";
import type { SkateLevel } from "@/types/user";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

// 119.9 -> "R$ 119,90"
export const formatBRL = (value: number) => currency.format(value);

// "2026-10-09T12:00:00.000Z" -> "09/10/2026"
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

// Coloca o traço do CEP enquanto a pessoa digita: "01310100" -> "01310-100"
export function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

// "R$ 1.119,90", "119,9" ou "119.90" -> número. Devolve null se não for um preço válido.
export function parsePrice(text: string) {
  const clean = text.replace(/[R$\s]/g, "");
  // Com vírgula, o ponto é separador de milhar; sem vírgula, o ponto é o decimal
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value > 0 ? value : null;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDENTE: "Aguardando pagamento",
  PAGO: "Pago",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

// Número curto do pedido, para mostrar na tela (o id completo é longo demais)
export const orderNumber = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

// "2026-10-14T12:00:00Z" -> "agora", "há 5 min", "há 3 h", "há 2 dias" ou a data (depois de uma semana)
export function timeAgo(iso: string, now = new Date()) {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "há 1 dia" : `há ${days} dias`;
  return formatDate(iso);
}

export const SKATE_LEVEL_LABEL: Record<SkateLevel, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
  PROFISSIONAL: "Profissional",
};
