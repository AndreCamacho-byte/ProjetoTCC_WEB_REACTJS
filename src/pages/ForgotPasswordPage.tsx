import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { FormAlert } from "@/components/FormAlert";
import { TextField } from "@/components/TextField";
import { AuthLayout } from "@/layouts/AuthLayout";
import { authService } from "@/services/auth";
import { getErrorMessage, validateEmail } from "@/utils/validation";
import { usePageTitle } from "@/hooks/usePageTitle";
import styles from "./AuthForm.module.css";

// "Esqueci minha senha": pede o email e envia o link para criar uma nova senha
export function ForgotPasswordPage() {
  usePageTitle("Esqueci minha senha");

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    const error = validateEmail(email);
    setFieldError(error);
    if (error) return;

    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSentTo(email.trim());
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const switcher = (
    <>
      <span>Lembrou a senha?</span>
      <Link to="/login">Entrar</Link>
    </>
  );

  if (sentTo) {
    return (
      <AuthLayout title="Confira seu email" subtitle="O link já está a caminho" switcher={switcher}>
        <div className={styles.form}>
          <p className={styles.text}>
            Se existir uma conta com o email <strong>{sentTo}</strong>, enviamos um link para criar uma nova senha. Ele
            vale por 1 hora.
          </p>
          <p className={styles.hint}>
            Não chegou? Confira a caixa de spam. Dá para pedir outro link depois de 1 minuto.
          </p>
          <Button type="button" onClick={() => setSentTo("")}>
            Usar outro email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Esqueci minha senha" subtitle="A gente te manda um link para criar outra" switcher={switcher}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField
          label="Email da conta"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(undefined);
          }}
          error={fieldError}
        />
        <Button type="submit" loading={loading} className={styles.submit}>
          Enviar link
        </Button>
      </form>
    </AuthLayout>
  );
}
