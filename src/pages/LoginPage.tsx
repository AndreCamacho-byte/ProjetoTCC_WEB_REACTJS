import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { FormAlert } from "@/components/FormAlert";
import { ResendVerification } from "@/components/ResendVerification";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ApiError } from "@/services/api";
import { authService } from "@/services/auth";
import { getErrorMessage, validateEmail, type FormErrors } from "@/utils/validation";
import styles from "./AuthForm.module.css";

type Field = "email" | "password";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors<Field>>({});
  const [formError, setFormError] = useState("");
  // Email da conta que tentou entrar sem ter confirmado (mostra o aviso com "Reenviar email")
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Se o usuário foi mandado para o login ao tentar abrir uma página protegida, volta para ela depois
  const state = location.state as { from?: string; message?: string } | null;
  const redirectTo = state?.from ?? "/";
  // Aviso vindo de outra tela (ex.: "Senha alterada" depois de redefinir a senha)
  const successMessage = state?.message;

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setUnverifiedEmail("");

    const nextErrors: FormErrors<Field> = {
      email: validateEmail(values.email),
      password: values.password ? undefined : "Informe sua senha",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    try {
      signIn(await authService.login(values));
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(values.email.trim());
      } else {
        setFormError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Que bom te ver de novo"
      switcher={
        <>
          <span>Ainda não tem conta?</span>
          <Link to="/register">Criar conta</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {successMessage && (
          <p className={styles.success} role="status">
            {successMessage}
          </p>
        )}
        {formError && <FormAlert>{formError}</FormAlert>}
        {unverifiedEmail && (
          <div className={styles.notice} role="alert">
            <p>
              <strong>Confirme seu email antes de entrar.</strong> Enviamos um código para {unverifiedEmail} quando
              você criou a conta.
            </p>
            <Link to="/verifique-email" state={{ email: unverifiedEmail }} className={styles.noticeLink}>
              Digitar o código
            </Link>
            <ResendVerification email={unverifiedEmail} />
          </div>
        )}
        <TextField
          label="Email"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Senha"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => update("password", e.target.value)}
          error={errors.password}
        />
        <Link to="/esqueci-senha" className={styles.forgotLink}>
          Esqueci minha senha
        </Link>
        <Button type="submit" loading={loading} className={styles.submit}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
