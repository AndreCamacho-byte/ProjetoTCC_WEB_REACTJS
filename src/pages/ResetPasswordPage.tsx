import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { FormAlert } from "@/components/FormAlert";
import { TextField } from "@/components/TextField";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ApiError } from "@/services/api";
import { authService } from "@/services/auth";
import { getErrorMessage, validateNewPassword, type FormErrors } from "@/utils/validation";
import styles from "./AuthForm.module.css";

type Field = "password" | "confirmPassword";

// Página aberta pelo link do email de "esqueci minha senha" (/redefinir-senha?token=...)
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FormErrors<Field>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    const nextErrors: FormErrors<Field> = {
      password: validateNewPassword(values.password),
      confirmPassword: values.confirmPassword === values.password ? undefined : "As senhas não são iguais",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !token) return;

    setLoading(true);
    try {
      await authService.resetPassword(token, values.password);
      navigate("/login", { replace: true, state: { message: "Senha alterada! Entre com a nova senha." } });
    } catch (error) {
      const expired = error instanceof ApiError && error.code === "INVALID_TOKEN";
      setFormError(expired ? "Este link é inválido ou já expirou. Peça um novo." : getErrorMessage(error));
      setLoading(false);
    }
  }

  const switcher = (
    <>
      <span>Lembrou a senha?</span>
      <Link to="/login">Entrar</Link>
    </>
  );

  if (!token) {
    return (
      <AuthLayout title="Link incompleto" subtitle="Não deu para ler o link" switcher={switcher}>
        <div className={styles.form}>
          <p className={styles.text}>Abra o link direto do email, ou peça um novo.</p>
          <Link to="/esqueci-senha" className={styles.noticeLink}>
            Pedir novo link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Criar nova senha" subtitle="Escolha uma senha que você vá lembrar" switcher={switcher}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError && (
          <>
            <FormAlert>{formError}</FormAlert>
            <Link to="/esqueci-senha" className={styles.noticeLink}>
              Pedir novo link
            </Link>
          </>
        )}
        <TextField
          label="Nova senha"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => update("password", e.target.value)}
          error={errors.password}
        />
        <TextField
          label="Confirmar nova senha"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />
        <Button type="submit" loading={loading} className={styles.submit}>
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  );
}
