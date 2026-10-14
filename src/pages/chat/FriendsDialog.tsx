import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { CloseIcon } from "@/components/icons";
import { chatService } from "@/services/chat";
import type { Author } from "@/types/community";
import { apiMessage } from "@/utils/validation";
import styles from "./Chat.module.css";

// Máximo de amigos de uma vez ao compartilhar (a mesma regra existe no backend)
export const MAX_SHARE_TARGETS = 10;

type Props = {
  title: string;
  // "one": clicar num amigo já escolhe (nova conversa). "many": marca vários (compartilhar post).
  mode: "one" | "many";
  onClose: () => void;
  onPickOne?: (friend: Author) => void;
  onSend?: (usernames: string[], message: string) => Promise<void>;
};

// Janela que lista os amigos (pessoas que se seguem) para conversar ou mandar um post
export function FriendsDialog({ title, mode, onClose, onPickOne, onSend }: Props) {
  const [friends, setFriends] = useState<Author[] | null>(null);
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    chatService.listFriends().then(setFriends, (err) => setError(apiMessage(err)));
  }, []);

  // Fecha com a tecla Esc
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const term = filter.trim().toLowerCase().replace(/^@/, "");
  const visible = (friends ?? []).filter(
    (friend) => !term || friend.name.toLowerCase().includes(term) || friend.username.includes(term),
  );

  function toggle(username: string) {
    setError("");
    if (picked.includes(username)) return setPicked(picked.filter((u) => u !== username));
    if (picked.length >= MAX_SHARE_TARGETS) return setError(`Escolha no máximo ${MAX_SHARE_TARGETS} amigos de uma vez.`);
    setPicked([...picked, username]);
  }

  async function send() {
    if (!onSend || picked.length === 0) return;
    setSending(true);
    setError("");
    try {
      await onSend(picked, message.trim());
      setSent(true);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  }

  let body: ReactNode;
  if (friends && friends.length === 0) {
    body = (
      <p className={styles.empty}>
        Você ainda não tem amigos no Clutch. Amigos são pessoas que você segue e que seguem você de volta.{" "}
        <Link to="/comunidade" onClick={onClose}>
          Encontrar skatistas
        </Link>
      </p>
    );
  } else {
    body = (
      <>
        {friends && (
          <input
            className={styles.filter}
            type="search"
            placeholder="Buscar amigo"
            aria-label="Buscar amigo"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        )}
        {!friends && !error && <p className={styles.empty}>Carregando...</p>}
        <ul className={styles.friends}>
          {visible.map((friend) => (
            <li key={friend.id}>
              {mode === "one" ? (
                <button type="button" className={styles.friend} onClick={() => onPickOne?.(friend)}>
                  <Avatar user={friend} size={40} />
                  <span className={styles.friendText}>
                    <strong>{friend.name}</strong>
                    <span>@{friend.username}</span>
                  </span>
                </button>
              ) : (
                <label className={styles.friend}>
                  <Avatar user={friend} size={40} />
                  <span className={styles.friendText}>
                    <strong>{friend.name}</strong>
                    <span>@{friend.username}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={picked.includes(friend.username)}
                    onChange={() => toggle(friend.username)}
                    aria-label={`Enviar para ${friend.name}`}
                  />
                </label>
              )}
            </li>
          ))}
        </ul>
        {mode === "many" && friends && friends.length > 0 && (
          <textarea
            aria-label="Mensagem junto com o post (opcional)"
            placeholder="Escreva uma mensagem (opcional)"
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}
      </>
    );
  }

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.dialogHeader}>
          <h2>{title}</h2>
          <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </header>
        <div className={styles.dialogBody}>
          {sent ? (
            <p className={styles.success} role="status">
              Enviado para {picked.length === 1 ? "1 amigo" : `${picked.length} amigos`}! Veja em Mensagens.
            </p>
          ) : (
            body
          )}
          {error && (
            <p className={styles.error} role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
        </div>
        {mode === "many" && (
          <footer className={styles.dialogFooter}>
            <button type="button" className={styles.secondary} onClick={onClose}>
              {sent ? "Fechar" : "Cancelar"}
            </button>
            {!sent && (
              <button type="button" className={styles.primary} disabled={picked.length === 0 || sending} onClick={send}>
                {sending ? "Enviando..." : picked.length > 0 ? `Enviar (${picked.length})` : "Enviar"}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
