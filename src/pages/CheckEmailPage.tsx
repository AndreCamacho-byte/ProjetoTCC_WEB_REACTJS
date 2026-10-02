import { useId, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { FormAlert } from "@/components/FormAlert";
import { ResendVerification } from "@/components/ResendVerification";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { authService } from "@/services/auth";
import { getErrorMessage, validateEmail } from "@/utils/validation";
import styles from "./AuthForm.module.css";

// Tela mostrada logo depois do cadastro: a pessoa digita o código de 6 dígitos que chegou por email
// (ou clica no botão do próprio email, que abre a página /confirmar-email).
export function CheckEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const codeId = useId();
  const state = location.state as { email?: string; justSent?: boolean } | null;
  const sentTo = state?.email;
  // Se a pessoa chegou aqui sem vir do cadastro (ex.: recarregou a página), pede o email também
  const [email, setEmail] = useState(sentTo ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const emailError = validateEmail(email);
    if (emailError) return setError(emailError);
    if (code.length !== 6) return setError("Digite os 6 dígitos do código.");

    setLoading(true);
    try {
      signIn(await authService.verifyCode(email.trim(), code));
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Confira seu email"
      subtitle="Falta só um passo para entrar na crew"
      switcher={
        <>
          <span>Já confirmou?</span>
          <Link to="/login">Entrar</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {sentTo ? (
          <p className={styles.text}>
            Enviamos um código de 6 dígitos para <strong>{sentTo}</strong>. Digite abaixo para ativar sua conta.
          </p>
        ) : (
          <>
            <p className={styles.text}>Informe o email do cadastro e o código de 6 dígitos que enviamos para ele.</p>
            <TextField
              label="Email"
              type="email"
              placeholder="voce@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </>
        )}

        {error && <FormAlert>{error}</FormAlert>}

        <div className={styles.codeField}>
          <label htmlFor={codeId}>Código de confirmação</label>
          <input
            id={codeId}
            className={styles.codeInput}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={code}
            // Aceita só números (inclusive ao colar o código com espaços)
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoFocus={Boolean(sentTo)}
          />
        </div>

        <Button type="submit" loading={loading}>
          Confirmar
        </Button>

        <p className={styles.hint}>
          O código vale por 15 minutos. Não chegou? Confira a caixa de spam ou peça outro. Você também pode clicar no
          botão que está no email.
        </p>
        <ResendVerification email={email.trim()} startWithCooldown={Boolean(state?.justSent)} />
      </form>
    </AuthLayout>
  );
}
