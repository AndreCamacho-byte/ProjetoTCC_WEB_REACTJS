import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { FormAlert } from "@/components/FormAlert";
import { TextField } from "@/components/TextField";
import { AuthLayout } from "@/layouts/AuthLayout";
import { authService } from "@/services/auth";
import { getErrorMessage, validateEmail, validateName, validateNewPassword, type FormErrors } from "@/utils/validation";
import styles from "./AuthForm.module.css";

type Field = "name" | "email" | "password" | "confirmPassword";

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // O formulário "Come Ride With Us" da home manda o email já digitado
  const initialEmail = (location.state as { email?: string } | null)?.email ?? "";
  const [values, setValues] = useState({ name: "", email: initialEmail, password: "", confirmPassword: "" });
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
      name: validateName(values.name),
      email: validateEmail(values.email),
      password: validateNewPassword(values.password),
      confirmPassword: values.confirmPassword === values.password ? undefined : "As senhas não são iguais",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    try {
      // A conta nasce sem confirmação: em vez de entrar, vai para a tela "Confira seu email"
      const { email } = await authService.register({ name: values.name, email: values.email, password: values.password });
      navigate("/verifique-email", { replace: true, state: { email, justSent: true } });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Entre para a crew do Clutch"
      switcher={
        <>
          <span>Já tem uma conta?</span>
          <Link to="/login">Entrar</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField
          label="Nome"
          placeholder="Seu nome"
          autoComplete="name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
        />
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
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => update("password", e.target.value)}
          error={errors.password}
        />
        <TextField
          label="Confirmar senha"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />
        <Button type="submit" loading={loading} className={styles.submit}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
