import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminTabs } from "@/components/AdminTabs";
import { usePageTitle } from "@/hooks/usePageTitle";
import { adminService } from "@/services/admin";
import { communityService } from "@/services/community";
import { moderationService, type Report, type ReportStatus } from "@/services/moderation";
import { REPORT_REASON_LABEL, REPORT_TARGET_LABEL, formatDate } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./AdminUsersPage.module.css";
import spotStyles from "./spots/Spots.module.css";

const STATUSES: { value: ReportStatus; label: string }[] = [
  { value: "ABERTA", label: "Abertas" },
  { value: "RESOLVIDA", label: "Resolvidas" },
  { value: "DESCARTADA", label: "Descartadas" },
];

const person = (p: Report["reporter"]) => (p ? `${p.name} (@${p.username})` : "conta apagada");

// Painel do administrador: denúncias de posts, comentários, perfis e mensagens
export function AdminReportsPage() {
  usePageTitle("Denúncias · Painel admin");

  const [status, setStatus] = useState<ReportStatus>("ABERTA");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setReports(await moderationService.listReports(status));
    } catch (err) {
      setError(apiMessage(err));
    }
  }, [status]);

  useEffect(() => {
    setReports(null);
    load();
  }, [load]);

  async function run(report: Report, action: () => Promise<unknown>) {
    setBusyId(report.id);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  // Apagar o conteúdo já resolve a denúncia
  function removeContent(report: Report) {
    const what = report.targetType === "POST" ? "este post" : "este comentário";
    if (!window.confirm(`Apagar ${what}? Não dá para desfazer.`)) return;
    void run(report, async () => {
      if (report.targetType === "POST") await communityService.deletePost(report.targetId);
      else await communityService.deleteComment(report.targetId);
      await moderationService.updateReport(report.id, "RESOLVIDA");
    });
  }

  function suspend(report: Report) {
    const user = report.reportedUser;
    if (!user) return;
    if (!window.confirm(`Suspender ${person(user)}? A pessoa não entra mais e some da comunidade.`)) return;
    void run(report, async () => {
      await adminService.updateUser(user.id, { suspended: true });
      await moderationService.updateReport(report.id, "RESOLVIDA");
    });
  }

  return (
    <div className={styles.page}>
      <AdminTabs />
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Administração</p>
          <h1 className={styles.title}>Denúncias</h1>
        </div>
      </header>

      <div className={spotStyles.tabs} role="tablist" aria-label="Situação das denúncias">
        {STATUSES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            className={status === value ? spotStyles.tabActive : spotStyles.tab}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className={spotStyles.error} role="alert" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}
      {reports === null && !error && <p className={spotStyles.muted}>Carregando...</p>}
      {reports?.length === 0 && (
        <p className={spotStyles.empty}>
          {status === "ABERTA" ? "Nenhuma denúncia esperando análise." : "Nenhuma denúncia aqui."}
        </p>
      )}

      {reports && reports.length > 0 && (
        <ul className={spotStyles.reviewList}>
          {reports.map((report) => {
            const busy = busyId === report.id;
            const canRemove = report.targetExists && (report.targetType === "POST" || report.targetType === "COMMENT");
            return (
              <li key={report.id} className={spotStyles.card}>
                <div className={spotStyles.header} style={{ marginBottom: 8 }}>
                  <div>
                    <strong>
                      {REPORT_TARGET_LABEL[report.targetType]} · {REPORT_REASON_LABEL[report.reason]}
                    </strong>
                    <br />
                    <span className={spotStyles.meta}>
                      Denunciado: {person(report.reportedUser)}
                      {report.reportedUser?.suspendedAt ? " (suspenso)" : ""}
                      <br />
                      Por {person(report.reporter)} em {formatDate(report.createdAt)}
                    </span>
                  </div>
                  {!report.targetExists && <span className={spotStyles.badgeBad}>Já apagado</span>}
                </div>

                {report.excerpt && <blockquote className={spotStyles.description}>“{report.excerpt}”</blockquote>}
                {report.details && (
                  <p className={spotStyles.description}>
                    <strong>Detalhes:</strong> {report.details}
                  </p>
                )}

                <div className={spotStyles.actions}>
                  {report.postId && (
                    <Link to={`/comunidade/post/${report.postId}`} className={spotStyles.secondary}>
                      Abrir post
                    </Link>
                  )}
                  {report.targetType === "USER" && report.reportedUser && (
                    <Link to={`/u/${report.reportedUser.username}`} className={spotStyles.secondary}>
                      Abrir perfil
                    </Link>
                  )}
                  {status === "ABERTA" ? (
                    <>
                      {canRemove && (
                        <button type="button" className={spotStyles.danger} disabled={busy} onClick={() => removeContent(report)}>
                          Apagar {report.targetType === "POST" ? "post" : "comentário"}
                        </button>
                      )}
                      {report.reportedUser && !report.reportedUser.suspendedAt && (
                        <button type="button" className={spotStyles.danger} disabled={busy} onClick={() => suspend(report)}>
                          Suspender conta
                        </button>
                      )}
                      <button
                        type="button"
                        className={spotStyles.primary}
                        disabled={busy}
                        onClick={() => run(report, () => moderationService.updateReport(report.id, "RESOLVIDA"))}
                      >
                        Marcar resolvida
                      </button>
                      <button
                        type="button"
                        className={spotStyles.secondary}
                        disabled={busy}
                        onClick={() => run(report, () => moderationService.updateReport(report.id, "DESCARTADA"))}
                      >
                        Descartar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={spotStyles.secondary}
                      disabled={busy}
                      onClick={() => run(report, () => moderationService.updateReport(report.id, "ABERTA"))}
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
