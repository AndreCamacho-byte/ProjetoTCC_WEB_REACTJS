import { useEffect, useId, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { FormAlert } from "@/components/FormAlert";
import { ResendVerification } from "@/components/ResendVerification";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ApiError } from "@/services/api";
import { authService } from "@/services/auth";
import { deviceTokens } from "@/services/deviceTokens";
import type { AuthResponse } from "@/types/user";
import { getErrorMessage, validateEmail, type FormErrors } from "@/utils/validation";
import { usePageTitle } from "@/hooks/usePageTitle";
import styles from "./AuthForm.module.css";

type Field = "email" | "password";

// Espera entre um reenvio do código e outro (o backend também só manda um por minuto)
const RESEND_SECONDS = 60;

// Login em duas etapas: email e senha; depois, o código de 6 dígitos que chega por email
export function LoginPage() {
  usePageTitle("Entrar");

  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors<Field>>({});
  const [formError, setFormError] = useState("");
  // Email da conta que tentou entrar sem ter confirmado (mostra o aviso com "Reenviar email")
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  // Preenchido quando a senha confere: a tela passa a pedir o código enviado para este email
  const [codeSentTo, setCodeSentTo] = useState("");

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
      // Se este aparelho foi lembrado, a chave vai junto e o login termina sem código
      const response = await authService.login({ ...values, deviceToken: deviceTokens.get(values.email) });
      if ("token" in response) return finish(response);
      setCodeSentTo(response.email);
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

  function finish(response: AuthResponse) {
    signIn(response);
    navigate(redirectTo, { replace: true });
  }

  if (codeSentTo) {
    return (
      <CodeStep
        email={codeSentTo}
        resend={() => authService.login(values)}
        onBack={() => setCodeSentTo("")}
        onDone={(response) => {
          // Marcou "Lembrar este aparelho": guarda a chave; não marcou: esquece a que havia
          if (response.deviceToken) deviceTokens.set(codeSentTo, response.deviceToken);
          else deviceTokens.remove(codeSentTo);
          finish(response);
        }}
      />
    );
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

type CodeStepProps = {
  email: string;
  resend: () => Promise<unknown>;
  onBack: () => void;
  onDone: (response: AuthResponse) => void;
};

// Segunda etapa: digitar o código que chegou no email
function CodeStep({ email, resend, onBack, onDone }: CodeStepProps) {
  const codeId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);
  // Desmarcado por padrão: o site é muito usado em computadores da escola (compartilhados)
  const [remember, setRemember] = useState(false);

  // Contagem regressiva para liberar o "Reenviar código"
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    if (code.length !== 6) return setError("Digite os 6 dígitos do código.");

    setLoading(true);
    try {
      onDone(await authService.verifyLogin(email, code, remember));
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setInfo("");
    setWait(RESEND_SECONDS);
    try {
      await resend();
      setInfo("Mandamos um código novo. Use o mais recente.");
      setCode("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <AuthLayout
      title="Confira seu email"
      subtitle="Só mais um passo para entrar"
      switcher={
        <>
          <span>Não reconhece este pedido?</span>
          <Link to="/esqueci-senha">Trocar a senha</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.text}>
          Para proteger sua conta, enviamos um código de 6 dígitos para <strong>{email}</strong>. Digite abaixo para
          entrar.
        </p>

        {error && <FormAlert>{error}</FormAlert>}
        {info && (
          <p className={styles.success} role="status">
            {info}
          </p>
        )}

        <div className={styles.codeField}>
          <label htmlFor={codeId}>Código de acesso</label>
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
            autoFocus
          />
        </div>

        <label className={styles.remember}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>
            Lembrar este aparelho por 30 dias
            <small>Nos próximos logins, só email e senha. Não marque em computador compartilhado.</small>
          </span>
        </label>

        <Button type="submit" loading={loading}>
          Entrar
        </Button>

        <p className={styles.hint}>O código vale por 10 minutos. Não chegou? Confira a caixa de spam.</p>
        <button type="button" className={styles.linkButton} onClick={handleResend} disabled={wait > 0}>
          {wait > 0 ? `Reenviar código em ${wait}s` : "Reenviar código"}
        </button>
        <button type="button" className={styles.linkButton} onClick={onBack}>
          Voltar e trocar email ou senha
        </button>
      </form>
    </AuthLayout>
  );
}
