import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ResendVerification } from "@/components/ResendVerification";
import { TextField } from "@/components/TextField";
import { AuthLayout } from "@/layouts/AuthLayout";
import styles from "./AuthForm.module.css";

// Tela mostrada logo depois do cadastro: pede para a pessoa abrir o email e clicar no link
export function CheckEmailPage() {
  const location = useLocation();
  const sentTo = (location.state as { email?: string } | null)?.email;
  // Se a pessoa chegou aqui sem vir do cadastro (ex.: recarregou a página), pede o email para reenviar
  const [email, setEmail] = useState(sentTo ?? "");

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
      <div className={styles.form}>
        {sentTo ? (
          <p className={styles.text}>
            Enviamos um link de confirmação para <strong>{sentTo}</strong>. Abra o email e clique em{" "}
            <strong>Confirmar email</strong> para ativar sua conta. O link vale por 24 horas.
          </p>
        ) : (
          <>
            <p className={styles.text}>Informe o email do cadastro para receber um novo link de confirmação.</p>
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
        <p className={styles.hint}>Não chegou? Confira a caixa de spam ou reenvie abaixo.</p>
        <ResendVerification email={email.trim()} startWithCooldown={Boolean(sentTo)} />
      </div>
    </AuthLayout>
  );
}
