import { useId, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { accountService } from "@/services/account";
import { apiMessage, cleanUsername, validateUsername } from "@/utils/validation";
import styles from "./UsernameGate.module.css";

// Contas antigas tiveram o @ gerado a partir do email (e ele mostrava parte do email para todo mundo).
// Enquanto a pessoa não escolher um @ novo, esta janela aparece por cima do site e não deixa continuar.
export function UsernameGate() {
  const { user, updateUser } = useAuth();
  const inputId = useId();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Só para quem está logado e ainda não escolheu (contas novas já escolhem no cadastro)
  if (!user || user.usernameChosen !== false) return null;
  const currentUsername = user.username;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validateUsername(username);
    if (problem) return setError(problem);
    // O @ atual veio do email: manter o mesmo continuaria mostrando parte dele
    if (cleanUsername(username) === currentUsername) return setError("Escolha um @ diferente do atual.");

    setError("");
    setSaving(true);
    try {
      updateUser(await accountService.updateProfile({ username: cleanUsername(username) }));
    } catch (err) {
      setError(apiMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
        onSubmit={handleSubmit}
        noValidate
      >
        <p className={styles.kicker}>Antes de continuar</p>
        <h2 id={`${inputId}-title`} className={styles.title}>
          Escolha seu @username
        </h2>
        <p className={styles.text}>
          Seu @ atual foi criado a partir do seu email. Para o seu email não aparecer para ninguém, escolha um @ novo.
          É assim que a galera vai te achar.
        </p>

        <label htmlFor={inputId} className={styles.label}>
          Novo @username
        </label>
        <div className={styles.inputRow}>
          <span aria-hidden="true">@</span>
          <input
            id={inputId}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ex.: tony_hawk"
            autoComplete="username"
            autoCapitalize="none"
            maxLength={21}
            autoFocus
          />
        </div>
        <p className={styles.hint}>De 3 a 20 letras minúsculas, números ou _</p>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </form>
    </div>
  );
}
