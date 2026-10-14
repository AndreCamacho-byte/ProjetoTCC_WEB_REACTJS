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
export const MAX_POST_PHOTOS = 4;

type Props = { user: User; onPosted: (post: Post) => void };

// Caixa para escrever um post, com até 4 fotos
export function Composer({ user, onPosted }: Props) {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const remaining = MAX_POST_LENGTH - text.length;
  const canPost = (text.trim().length > 0 || photos.length > 0) && remaining >= 0 && !busy && !preparing;

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // permite escolher os mesmos arquivos de novo
    if (files.length === 0) return;

    setError("");
    const room = MAX_POST_PHOTOS - photos.length;
    if (files.length > room) {
      setError(`Cada post pode ter até ${MAX_POST_PHOTOS} fotos. Só as primeiras ${room === 1 ? "uma foi adicionada" : `${room} foram adicionadas`}.`);
    }

    setPreparing(true);
    try {
      // Reduz cada foto no próprio navegador, na ordem em que foram escolhidas
      const ready: string[] = [];
      for (const file of files.slice(0, room)) ready.push(await fileToPostPhoto(file));
      setPhotos((current) => [...current, ...ready].slice(0, MAX_POST_PHOTOS));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir essa imagem.");
    } finally {
      setPreparing(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canPost) return;

    setBusy(true);
    setError("");
    try {
      const post = await communityService.createPost(text.trim(), photos);
      setText("");
      setPhotos([]);
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

        {photos.length > 0 && (
          <ul className={styles.previews} aria-label="Fotos escolhidas">
            {photos.map((photo, index) => (
              <li key={index} className={styles.preview}>
                <img src={photo} alt={`Foto ${index + 1} escolhida para o post`} />
                <button
                  type="button"
                  className={styles.removePhoto}
                  aria-label={`Tirar a foto ${index + 1}`}
                  onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                >
                  <CloseIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className={styles.error} role="alert" style={{ marginTop: 10 }}>
            {error}
          </p>
        )}

        <div className={styles.composerBar}>
          <div className={styles.composerTools}>
            <button
              type="button"
              className={styles.iconButton}
              disabled={busy || preparing || photos.length >= MAX_POST_PHOTOS}
              onClick={() => fileInput.current?.click()}
            >
              <ImageIcon size={20} />
              {preparing ? "Preparando..." : photos.length > 0 ? `Fotos (${photos.length}/${MAX_POST_PHOTOS})` : "Fotos"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className={styles.fileInput}
              onChange={handleFiles}
              aria-label="Escolher fotos para o post"
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
