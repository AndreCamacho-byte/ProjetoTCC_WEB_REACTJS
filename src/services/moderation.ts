import type { Author } from "@/types/community";
import { api } from "./api";

export type ReportTarget = "POST" | "COMMENT" | "USER" | "MESSAGE";
export type ReportReason = "SPAM" | "OFENSA" | "ASSEDIO" | "CONTEUDO_IMPROPRIO" | "RISCO" | "OUTRO";
export type ReportStatus = "ABERTA" | "RESOLVIDA" | "DESCARTADA";

type Person = { id: string; name: string; username: string; suspendedAt: string | null };

// Denúncia como aparece no painel do admin (nome e @, nunca o email)
export type Report = {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  excerpt: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  reporter: Person | null;
  reportedUser: Person | null;
  // O conteúdo ainda existe? E em qual post ele está (posts e comentários)
  targetExists: boolean;
  postId: string | null;
};

export type BlockState = { blockedByMe: boolean };

// Denúncias e bloqueios
export const moderationService = {
  report: (data: { targetType: ReportTarget; targetId: string; reason: ReportReason; details?: string }) =>
    api<{ message: string }>("/reports", { method: "POST", body: data }),

  block: (username: string) => api<BlockState>(`/profiles/${encodeURIComponent(username)}/block`, { method: "POST" }),
  unblock: (username: string) => api<BlockState>(`/profiles/${encodeURIComponent(username)}/block`, { method: "DELETE" }),
  listBlocked: () => api<Author[]>("/blocks"),

  // Painel do admin
  listReports: (status: ReportStatus) => api<Report[]>(`/admin/reports?${new URLSearchParams({ status })}`),
  updateReport: (id: string, status: ReportStatus) =>
    api<{ id: string; status: ReportStatus }>(`/admin/reports/${id}`, { method: "PATCH", body: { status } }),
};
