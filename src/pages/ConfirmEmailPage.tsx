import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { FormAlert } from "@/components/FormAlert";
import { ResendVerification } from "@/components/ResendVerification";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { authService } from "@/services/auth";
import { getErrorMessage } from "@/utils/validation";
import { usePageTitle } from "@/hooks/usePageTitle";
import styles from "./AuthForm.module.css";

type Status = { type: "loading" } | { type: "success"; name: string } | { type: "error"; message: string };

// Página aberta pelo link do email (/confirmar-email?token=...)
export function ConfirmEmailPage() {
  usePageTitle("Confirmar email");

  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [status, setStatus] = useState<Status>(
    token ? { type: "loading" } : { type: "error", message: "Link incompleto. Abra o link direto do email." },
  );
  const [email, setEmail] = useState("");
  // O React (em modo de desenvolvimento) roda os efeitos duas vezes; o link só pode ser usado uma vez
  const alreadySent = useRef(false);

  useEffect(() => {
    if (!token || alreadySent.current) return;
    alreadySent.current = true;

    authService
      .verifyEmail(token)
      .then((response) => {
        signIn(response);
        setStatus({ type: "success", name: response.user.name.split(" ")[0] });
      })
      .catch((error) => setStatus({ type: "error", message: getErrorMessage(error) }));
  }, [token, signIn]);

  if (status.type === "loading") {
    return (
      <AuthLayout title="Confirmando..." subtitle="Só um instante" switcher={null}>
        <p className={styles.text}>Estamos confirmando o seu email.</p>
      </AuthLayout>
    );
  }

  if (status.type === "success") {
    return (
      <AuthLayout title="Email confirmado!" subtitle={`Boas-vindas à crew, ${status.name}`} switcher={null}>
        <div className={styles.form}>
          <p className={styles.text}>Sua conta está ativa e você já está conectado.</p>
          <Button type="button" onClick={() => navigate("/", { replace: true })}>
            Ir para a home
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Não deu certo"
      subtitle="O link não pôde ser confirmado"
      switcher={
        <>
          <span>Já confirmou antes?</span>
          <Link to="/login">Entrar</Link>
        </>
      }
    >
      <div className={styles.form}>
        <FormAlert>{status.message}</FormAlert>
        <p className={styles.text}>Informe o email do cadastro para receber um novo link.</p>
        <TextField
          label="Email"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <ResendVerification email={email.trim()} />
      </div>
    </AuthLayout>
  );
}
