import { useEffect, useState } from "react";
import { authService } from "@/services/auth";
import { getErrorMessage } from "@/utils/validation";
import styles from "./ResendVerification.module.css";

const COOLDOWN_SECONDS = 60; // mesmo intervalo que o backend aceita entre reenvios

type ResendVerificationProps = {
  email: string;
  // Começa já em espera (ex.: logo depois do cadastro, quando o email acabou de ser enviado)
  startWithCooldown?: boolean;
};

// Botão "Reenviar email" com contagem regressiva para não disparar vários emails seguidos
export function ResendVerification({ email, startWithCooldown = false }: ResendVerificationProps) {
  const [secondsLeft, setSecondsLeft] = useState(startWithCooldown ? COOLDOWN_SECONDS : 0);
  const [status, setStatus] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function resend() {
    setSending(true);
    setStatus(null);
    try {
      await authService.resendVerification(email);
      setStatus({ type: "ok", text: "Pronto! Enviamos um novo link. Confira também a caixa de spam." });
      setSecondsLeft(COOLDOWN_SECONDS);
    } catch (error) {
      setStatus({ type: "error", text: getErrorMessage(error) });
    } finally {
      setSending(false);
    }
  }

  const disabled = sending || secondsLeft > 0 || !email;

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.button} onClick={resend} disabled={disabled}>
        {sending ? "Enviando..." : secondsLeft > 0 ? `Reenviar email (${secondsLeft}s)` : "Reenviar email"}
      </button>
      {status && (
        <p className={status.type === "ok" ? styles.ok : styles.error} role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}
