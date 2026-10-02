import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { accountService } from "@/services/account";
import { ApiError } from "@/services/api";
import type { User } from "@/types/user";
import { MIN_AGE, ageFrom, ageStatus, formatBirthDate } from "@/utils/age";
import { fileToAvatar } from "@/utils/image";
import { getErrorMessage, todayIso, validateBirthDate, validateNewPassword } from "@/utils/validation";
import { usePageTitle } from "@/hooks/usePageTitle";
import styles from "./AccountSettingsPage.module.css";

type Feedback = { type: "ok" | "error"; text: string } | null;

// Mensagem para mostrar quando uma ação da conta falha
function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "WRONG_PASSWORD") return "Senha incorreta.";
    if (error.code === "RATE_LIMITED") return error.message;
    if (error.details.length > 0) return error.details.map((d) => d.message).join(" ");
    if (error.status === 409 || error.status === 413 || error.status === 400) return error.message;
    return getErrorMessage(error);
  }
  // Erros do preparo da foto (arquivo inválido, grande demais) já vêm com a mensagem pronta
  return error instanceof Error ? error.message : "Algo deu errado. Tente novamente.";
}

// Configurações da conta: foto de perfil, nome, @username e exclusão da conta
export function AccountSettingsPage() {
  usePageTitle("Configurações");

  const { user } = useAuth();
  // A rota é protegida, então aqui sempre há usuário (a checagem é só para o TypeScript)
  if (!user) return null;

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.kicker}>Sua conta</p>
        <h1 className={styles.title}>Configurações</h1>
      </header>

      <AvatarSection user={user} />
      <ProfileSection user={user} />
      <PasswordSection />
      <AgeSection user={user} />
      <DangerSection />
    </div>
  );
}

function Message({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p className={feedback.type === "ok" ? styles.ok : styles.error} role={feedback.type === "ok" ? "status" : "alert"}>
      {feedback.text}
    </p>
  );
}

function AvatarSection({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;

    setBusy(true);
    setFeedback(null);
    try {
      updateUser(await accountService.setAvatar(await fileToAvatar(file)));
      setFeedback({ type: "ok", text: "Foto atualizada." });
    } catch (error) {
      setFeedback({ type: "error", text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setFeedback(null);
    try {
      updateUser(await accountService.removeAvatar());
      setFeedback({ type: "ok", text: "Foto removida." });
    } catch (error) {
      setFeedback({ type: "error", text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>Foto de perfil</h2>
      <div className={styles.avatarRow}>
        <Avatar user={user} size={96} />
        <div className={styles.avatarActions}>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className={styles.fileInput}
            onChange={handleFile}
            aria-label="Escolher foto de perfil"
          />
          <button type="button" className={styles.primary} onClick={() => fileInput.current?.click()} disabled={busy}>
            {busy ? "Enviando..." : user.avatarUrl ? "Trocar foto" : "Escolher foto"}
          </button>
          {user.avatarUrl && (
            <button type="button" className={styles.secondary} onClick={remove} disabled={busy}>
              Remover
            </button>
          )}
          <p className={styles.hint}>JPG, PNG ou WebP. A foto é recortada em um quadrado.</p>
        </div>
      </div>
      <Message feedback={feedback} />
    </section>
  );
}

function ProfileSection({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const cleanName = name.trim();
  const cleanUsername = username.trim().toLowerCase();
  const changed = cleanName !== user.name || cleanUsername !== user.username;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (cleanName.length < 2) return setFeedback({ type: "error", text: "Informe seu nome." });
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return setFeedback({ type: "error", text: "O @username precisa ter de 3 a 20 letras minúsculas, números ou _." });
    }

    setSaving(true);
    try {
      const updated = await accountService.updateProfile({
        ...(cleanName !== user.name ? { name: cleanName } : {}),
        ...(cleanUsername !== user.username ? { username: cleanUsername } : {}),
      });
      updateUser(updated);
      setName(updated.name);
      setUsername(updated.username);
      setFeedback({ type: "ok", text: "Dados salvos." });
    } catch (error) {
      setFeedback({ type: "error", text: errorText(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>Seus dados</h2>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
        </label>
        <label>
          Nome de usuário
          <span className={styles.usernameField}>
            <span aria-hidden>@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </span>
          <small>De 3 a 20 caracteres: letras minúsculas, números e _.</small>
        </label>
        <label>
          Email
          <input value={user.email} disabled />
          <small>O email não pode ser alterado.</small>
        </label>
        <Message feedback={feedback} />
        <button type="submit" className={styles.primary} disabled={!changed || saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </section>
  );
}

// Troca de senha por quem está logado
function PasswordSection() {
  const { signIn } = useAuth();
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const update = (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    if (!values.current) return setFeedback({ type: "error", text: "Informe a senha atual." });
    const invalid = validateNewPassword(values.next);
    if (invalid) return setFeedback({ type: "error", text: invalid + "." });
    if (values.next !== values.confirm) return setFeedback({ type: "error", text: "As senhas não são iguais." });

    setSaving(true);
    try {
      // Guarda o token novo: os logins antigos (inclusive em outros aparelhos) deixam de valer
      signIn(await accountService.changePassword(values.current, values.next));
      setValues({ current: "", next: "", confirm: "" });
      setFeedback({ type: "ok", text: "Senha alterada. Os outros aparelhos foram desconectados." });
    } catch (error) {
      setFeedback({ type: "error", text: errorText(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>Senha</h2>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label>
          Senha atual
          <input type="password" autoComplete="current-password" value={values.current} onChange={update("current")} />
        </label>
        <label>
          Nova senha
          <input type="password" autoComplete="new-password" value={values.next} onChange={update("next")} />
          <small>Pelo menos 8 caracteres.</small>
        </label>
        <label>
          Confirmar nova senha
          <input type="password" autoComplete="new-password" value={values.confirm} onChange={update("confirm")} />
        </label>
        <Message feedback={feedback} />
        <button type="submit" className={styles.primary} disabled={saving}>
          {saving ? "Salvando..." : "Trocar senha"}
        </button>
      </form>
    </section>
  );
}

// Data de nascimento e a regra de idade dos spots e do marketplace
function AgeSection({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const status = ageStatus(user);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const invalid = validateBirthDate(birthDate);
    if (invalid) return setFeedback({ type: "error", text: invalid + "." });

    setSaving(true);
    setFeedback(null);
    try {
      updateUser(await accountService.setBirthDate(birthDate));
    } catch (error) {
      setFeedback({ type: "error", text: errorText(error) });
      setSaving(false);
    }
  }

  if (user.birthDate) {
    return (
      <section className={styles.card}>
        <h2>Idade</h2>
        <p className={styles.ageLine}>
          <span className={status === "OK" ? styles.badgeOk : styles.badgeWarn}>
            {status === "OK" ? "Verificada" : `Menor de ${MIN_AGE} anos`}
          </span>
          Nascimento em {formatBirthDate(user.birthDate)} ({ageFrom(user.birthDate)} anos)
        </p>
        <p className={styles.note}>
          {status === "OK"
            ? "Spots, encontros e marketplace estão liberados para você."
            : `Spots, encontros e marketplace são liberados a partir dos ${MIN_AGE} anos.`}{" "}
          A data de nascimento não pode ser alterada por aqui.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <h2>Idade</h2>
      <p className={styles.ageLine}>
        <span className={styles.badgeWarn}>Não verificada</span>
      </p>
      <p className={styles.note}>
        Sua conta foi criada antes de pedirmos a data de nascimento. Informe a sua para liberar os spots, os encontros
        e o marketplace (a partir dos {MIN_AGE} anos).
      </p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label>
          Data de nascimento
          <input type="date" max={todayIso()} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          <small>Confira antes de salvar: depois não dá para alterar.</small>
        </label>
        <Message feedback={feedback} />
        <button type="submit" className={styles.primary} disabled={!birthDate || saving}>
          {saving ? "Salvando..." : "Salvar data de nascimento"}
        </button>
      </form>
    </section>
  );
}

function DangerSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className={`${styles.card} ${styles.dangerCard}`}>
      <h2>Excluir conta</h2>
      <p>
        Apaga a sua conta e tudo que é dela: foto, posts, comentários, curtidas e encontros. Não dá para desfazer.
      </p>
      <button type="button" className={styles.danger} onClick={() => setOpen(true)}>
        Excluir minha conta
      </button>
      {open && <DeleteDialog onClose={() => setOpen(false)} />}
    </section>
  );
}

function DeleteDialog({ onClose }: { onClose: () => void }) {
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Fecha com a tecla Esc
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!password) return setError("Digite sua senha para confirmar.");

    setDeleting(true);
    try {
      await accountService.deleteAccount(password);
      signOut();
      // Recarrega direto na home: sem isso, a rota protegida mandaria a pessoa para a tela de login
      window.location.replace("/");
    } catch (err) {
      setError(errorText(err));
      setDeleting(false);
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.dialog} role="dialog" aria-modal="true" aria-label="Excluir conta" onSubmit={handleSubmit}>
        <h2>Excluir conta</h2>
        <p>
          Tem certeza? Sua conta será apagada para sempre. Para confirmar, digite a sua senha.
        </p>
        <label className={styles.dialogLabel}>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={styles.danger} disabled={deleting}>
            {deleting ? "Excluindo..." : "Excluir para sempre"}
          </button>
        </div>
      </form>
    </div>
  );
}
