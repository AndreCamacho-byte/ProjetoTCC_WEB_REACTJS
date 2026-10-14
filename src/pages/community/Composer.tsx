import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { CloseIcon, ImageIcon } from "@/components/icons";
import { communityService } from "@/services/community";
import type { Post } from "@/types/community";
import type { User } from "@/types/user";
import { fileToPostPhoto } from "@/utils/image";
import { apiMessage } from "@/utils/validation";
import styles from "./Community.module.css";

export const MAX_POST_LENGTH = 500;

type Props = { user: User; onPosted: (post: Post) => void };

// Caixa para escrever um post, com foto opcional
export function Composer({ user, onPosted }: Props) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const remaining = MAX_POST_LENGTH - text.length;
  const canPost = (text.trim().length > 0 || photo !== null) && remaining >= 0 && !busy;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setError("");
    try {
      setPhoto(await fileToPostPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir essa imagem.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canPost) return;

    setBusy(true);
    setError("");
    try {
      const post = await communityService.createPost(text.trim(), photo ?? undefined);
      setText("");
      setPhoto(null);
      onPosted(post);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`${styles.card} ${styles.composer}`} onSubmit={handleSubmit}>
      <Avatar user={user} size={44} />
      <div>
        <textarea
          aria-label="Escreva um post"
          placeholder="Como foi a sessão de hoje?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {photo && (
          <div className={styles.preview}>
            <img src={photo} alt="Foto escolhida para o post" />
            <button type="button" className={styles.removePhoto} aria-label="Tirar a foto" onClick={() => setPhoto(null)}>
              <CloseIcon size={16} />
            </button>
          </div>
        )}

        {error && (
          <p className={styles.error} role="alert" style={{ marginTop: 10 }}>
            {error}
          </p>
        )}

        <div className={styles.composerBar}>
          <div className={styles.composerTools}>
            <button type="button" className={styles.iconButton} disabled={busy} onClick={() => fileInput.current?.click()}>
              <ImageIcon size={20} />
              Foto
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.fileInput}
              onChange={handleFile}
              aria-label="Escolher foto para o post"
            />
            {text.length > MAX_POST_LENGTH - 100 && (
              <span className={`${styles.counter} ${remaining < 0 ? styles.counterOver : ""}`} aria-live="polite">
                {remaining}
              </span>
            )}
          </div>
          <button type="submit" className={styles.primary} disabled={!canPost}>
            {busy ? "Postando..." : "Postar"}
          </button>
        </div>
      </div>
    </form>
  );
}
