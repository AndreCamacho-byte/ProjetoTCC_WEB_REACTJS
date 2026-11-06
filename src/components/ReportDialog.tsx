import { useEffect, useState, type FormEvent } from "react";
import { CloseIcon } from "@/components/icons";
import { moderationService, type ReportReason, type ReportTarget } from "@/services/moderation";
import { REPORT_REASON_LABEL } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import chat from "@/pages/chat/Chat.module.css";
import styles from "./ReportDialog.module.css";

// Até 500 caracteres de detalhes (a mesma regra do backend)
export const MAX_REPORT_DETAILS = 500;

const REASONS = Object.keys(REPORT_REASON_LABEL) as ReportReason[];

type Props = {
  targetType: ReportTarget;
  targetId: string;
  // Ex.: "o post de @tony", usado no título e no texto
  description: string;
  onClose: () => void;
};

// Janela de denunciar: escolhe o motivo, escreve detalhes (opcional) e manda para a equipe
export function ReportDialog({ targetType, targetId, description, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Fecha com a tecla Esc
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reason) return setError("Escolha um motivo.");
    setSending(true);
    setError("");
    try {
      await moderationService.report({ targetType, targetId, reason, details: details.trim() || undefined });
      setSent(true);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={chat.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className={chat.dialog} role="dialog" aria-modal="true" aria-label={`Denunciar ${description}`} onSubmit={handleSubmit}>
        <header className={chat.dialogHeader}>
          <h2>Denunciar {description}</h2>
          <button type="button" className={chat.close} aria-label="Fechar" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </header>
        <div className={chat.dialogBody}>
          {sent ? (
            <p className={chat.success} role="status">
              Denúncia enviada. A equipe do Clutch vai analisar. Se quiser parar de ver essa pessoa, você também pode
              bloqueá-la pelo perfil.
            </p>
          ) : (
            <>
              <p className={styles.intro}>
                A pessoa não fica sabendo quem denunciou. A equipe vê um trecho do conteúdo para decidir o que fazer.
              </p>
              <fieldset className={styles.reasons}>
                <legend className="sr-only">Motivo</legend>
                {REASONS.map((value) => (
                  <label key={value} className={styles.reason}>
                    <input
                      type="radio"
                      name="reason"
                      value={value}
                      checked={reason === value}
                      onChange={() => {
                        setReason(value);
                        setError("");
                      }}
                    />
                    {REPORT_REASON_LABEL[value]}
                  </label>
                ))}
              </fieldset>
              <textarea
                aria-label="Detalhes (opcional)"
                placeholder="Conte o que aconteceu (opcional)"
                maxLength={MAX_REPORT_DETAILS}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </>
          )}
          {error && (
            <p className={chat.error} role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
        </div>
        <footer className={chat.dialogFooter}>
          <button type="button" className={chat.secondary} onClick={onClose}>
            {sent ? "Fechar" : "Cancelar"}
          </button>
          {!sent && (
            <button type="submit" className={chat.primary} disabled={sending}>
              {sending ? "Enviando..." : "Denunciar"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
