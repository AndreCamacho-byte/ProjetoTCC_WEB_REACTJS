import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import {
  BookmarkIcon,
  ChatIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CommentIcon,
  HeartIcon,
  LinkIcon,
  ShareIcon,
  TrashIcon,
} from "@/components/icons";
import { Lightbox } from "@/components/Lightbox";
import { chatService } from "@/services/chat";
import { FriendsDialog } from "../chat/FriendsDialog";
import { communityService } from "@/services/community";
import type { Author, Comment, Post } from "@/types/community";
import { SKATE_LEVEL_LABEL, timeAgo } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Community.module.css";

export const MAX_COMMENT_LENGTH = 300;

// Endereço do post para compartilhar (quem abrir precisa entrar na conta para ver)
export const postLink = (id: string) => `${window.location.origin}/comunidade/post/${id}`;

// Nome com link para o perfil, @ e nível de skate
export function AuthorLine({ author, time }: { author: Author; time: string }) {
  return (
    <div className={styles.who}>
      <Link to={`/u/${author.username}`} className={styles.name}>
        {author.name}
      </Link>
      {author.skateLevel && <span className={styles.level}>{SKATE_LEVEL_LABEL[author.skateLevel]}</span>}
      <span className={styles.meta}>
        @{author.username} · <time dateTime={time}>{timeAgo(time)}</time>
      </span>
    </div>
  );
}

type Props = {
  post: Post;
  onDeleted: (id: string) => void;
  // Na tela de salvos, o post sai da lista ao ser tirado dos salvos
  onUnsaved?: (id: string) => void;
};

export function PostCard({ post: initial, onDeleted, onUnsaved }: Props) {
  const [post, setPost] = useState(initial);
  const [showComments, setShowComments] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    // Muda na tela na hora e confirma com o servidor; se der erro, volta como estava
    const before = post;
    setPost({ ...post, likedByMe: !post.likedByMe, likeCount: post.likeCount + (post.likedByMe ? -1 : 1) });
    try {
      const state = before.likedByMe ? await communityService.unlike(post.id) : await communityService.like(post.id);
      setPost((current) => ({ ...current, ...state }));
    } catch (err) {
      setPost(before);
      setError(apiMessage(err));
    }
  }

  async function toggleSave() {
    const before = post;
    setPost({ ...post, savedByMe: !post.savedByMe });
    try {
      const state = before.savedByMe ? await communityService.unsave(post.id) : await communityService.save(post.id);
      setPost((current) => ({ ...current, ...state }));
      if (!state.savedByMe) onUnsaved?.(post.id);
    } catch (err) {
      setPost(before);
      setError(apiMessage(err));
    }
  }

  async function remove() {
    if (!window.confirm("Apagar este post? Os comentários e curtidas também somem.")) return;
    setBusy(true);
    try {
      await communityService.deletePost(post.id);
      onDeleted(post.id);
    } catch (err) {
      setError(apiMessage(err));
      setBusy(false);
    }
  }

  return (
    <article className={`${styles.card} ${styles.post}`}>
      <header className={styles.postHeader}>
        <Link to={`/u/${post.author.username}`} aria-label={`Perfil de ${post.author.name}`}>
          <Avatar user={post.author} size={44} />
        </Link>
        <AuthorLine author={post.author} time={post.createdAt} />
      </header>

      {post.content && <p className={styles.content}>{post.content}</p>}
      {post.imageUrls.length > 0 && <PostPhotos urls={post.imageUrls} authorName={post.author.name} />}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.iconButton} ${post.likedByMe ? styles.liked : ""}`}
          aria-pressed={post.likedByMe}
          aria-label={post.likedByMe ? "Descurtir" : "Curtir"}
          onClick={toggleLike}
        >
          <HeartIcon size={20} filled={post.likedByMe} />
          {post.likeCount}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-expanded={showComments}
          aria-label="Comentários"
          onClick={() => setShowComments((value) => !value)}
        >
          <CommentIcon size={20} />
          {post.commentCount}
        </button>
        <ShareButton post={post} />
        <button
          type="button"
          className={`${styles.iconButton} ${post.savedByMe ? styles.saved : ""}`}
          aria-pressed={post.savedByMe}
          aria-label={post.savedByMe ? "Tirar dos salvos" : "Salvar"}
          title={post.savedByMe ? "Tirar dos salvos" : "Salvar"}
          onClick={toggleSave}
        >
          <BookmarkIcon size={20} filled={post.savedByMe} />
        </button>
        {post.canDelete && (
          <button type="button" className={`${styles.iconButton} ${styles.deleteButton}`} disabled={busy} onClick={remove}>
            <TrashIcon size={18} />
            Apagar
          </button>
        )}
      </div>

      {showComments && (
        <Comments
          postId={post.id}
          onCountChange={(delta) => setPost((current) => ({ ...current, commentCount: current.commentCount + delta }))}
        />
      )}
    </article>
  );
}

// Fotos do post: uma por vez, com setas e bolinhas quando há mais de uma. Clicar amplia.
function PostPhotos({ urls, authorName }: { urls: string[]; authorName: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const many = urls.length > 1;
  const alt = many ? `Foto ${index + 1} de ${urls.length}, postada por ${authorName}` : `Foto postada por ${authorName}`;

  return (
    <div className={styles.photos}>
      <button type="button" className={styles.photoButton} aria-label={`Ampliar: ${alt}`} onClick={() => setOpen(true)}>
        <img className={styles.photo} src={urls[index]} alt={alt} loading="lazy" />
      </button>

      {many && (
        <>
          {index > 0 && (
            <button
              type="button"
              className={`${styles.photoArrow} ${styles.photoPrev}`}
              aria-label="Foto anterior"
              onClick={() => setIndex(index - 1)}
            >
              <ChevronLeftIcon size={20} />
            </button>
          )}
          {index < urls.length - 1 && (
            <button
              type="button"
              className={`${styles.photoArrow} ${styles.photoNext}`}
              aria-label="Próxima foto"
              onClick={() => setIndex(index + 1)}
            >
              <ChevronRightIcon size={20} />
            </button>
          )}
          <div className={styles.dots} aria-hidden>
            {urls.map((url, i) => (
              <span key={url} className={i === index ? styles.dotActive : styles.dot} />
            ))}
          </div>
        </>
      )}

      {open && <Lightbox images={urls} index={index} alt={alt} onIndexChange={setIndex} onClose={() => setOpen(false)} />}
    </div>
  );
}

// Compartilhar: enviar para amigos pelo chat do Clutch ou para fora (menu do aparelho no celular,
// copiar o link ou mandar pelo WhatsApp)
function ShareButton({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toFriends, setToFriends] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const link = postLink(post.id);
  const text = `Olha esse post de @${post.author.username} no Clutch`;

  // Fecha o menu ao clicar fora dele
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // O menu sempre abre: "Enviar para amigos" (dentro do Clutch) e as opções de fora
  function share() {
    setCopied(false);
    setOpen((value) => !value);
  }

  // Menu de compartilhar do próprio aparelho (no celular: WhatsApp, Instagram, mensagens...)
  async function shareOutside() {
    setOpen(false);
    try {
      await navigator.share({ title: "Clutch", text, url: link });
    } catch {
      // A pessoa fechou o menu do aparelho: não precisa fazer nada
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      window.prompt("Copie o link do post:", link);
    }
  }

  return (
    <div className={styles.shareWrapper} ref={menu}>
      <button type="button" className={styles.iconButton} aria-label="Compartilhar" aria-expanded={open} onClick={share}>
        <ShareIcon size={20} />
      </button>
      {open && (
        <div className={styles.shareMenu} role="menu">
          <button
            type="button"
            role="menuitem"
            className={styles.shareItem}
            onClick={() => {
              setOpen(false);
              setToFriends(true);
            }}
          >
            <ChatIcon size={18} />
            Enviar para amigos
          </button>
          {typeof navigator.share === "function" && (
            <button type="button" role="menuitem" className={styles.shareItem} onClick={shareOutside}>
              <ShareIcon size={18} />
              Compartilhar fora do Clutch
            </button>
          )}
          <button type="button" role="menuitem" className={styles.shareItem} onClick={copy}>
            <LinkIcon size={18} />
            {copied ? "Link copiado!" : "Copiar link"}
          </button>
          <a
            role="menuitem"
            className={styles.shareItem}
            href={`https://wa.me/?text=${encodeURIComponent(`${text}: ${link}`)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            <ShareIcon size={18} />
            Enviar pelo WhatsApp
          </a>
        </div>
      )}
      {toFriends && (
        <FriendsDialog
          title="Enviar para amigos"
          mode="many"
          onClose={() => setToFriends(false)}
          onSend={async (usernames, message) => {
            await chatService.sharePost(post.id, usernames, message);
          }}
        />
      )}
    </div>
  );
}

type CommentsProps = { postId: string; onCountChange: (delta: number) => void };

function Comments({ postId, onCountChange }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function load(cursor?: string) {
    try {
      const page = await communityService.getComments(postId, cursor);
      setComments((current) => (cursor ? [...current, ...page.comments] : page.comments));
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoaded(true);
    }
  }

  // Busca os comentários quando a lista abre
  useEffect(() => {
    load();
  }, [postId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;

    setSending(true);
    setError("");
    try {
      const comment = await communityService.createComment(postId, content);
      setComments((current) => [...current, comment]);
      setText("");
      onCountChange(1);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    try {
      await communityService.deleteComment(id);
      setComments((current) => current.filter((comment) => comment.id !== id));
      onCountChange(-1);
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  return (
    <section className={styles.comments} aria-label="Comentários">
      {loaded && comments.length === 0 && <p className={styles.muted} style={{ margin: 0 }}>Nenhum comentário ainda.</p>}

      {comments.map((comment) => (
        <div key={comment.id} className={styles.comment}>
          <Link to={`/u/${comment.author.username}`} aria-label={`Perfil de ${comment.author.name}`}>
            <Avatar user={comment.author} size={32} />
          </Link>
          <div className={styles.commentBody}>
            <Link to={`/u/${comment.author.username}`} className={styles.name}>
              {comment.author.name}
            </Link>{" "}
            <span className={styles.muted}>· {timeAgo(comment.createdAt)}</span>
            <p>{comment.content}</p>
          </div>
          {comment.canDelete && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Apagar comentário de ${comment.author.name}`}
              onClick={() => remove(comment.id)}
            >
              <TrashIcon size={16} />
            </button>
          )}
        </div>
      ))}

      {nextCursor && (
        <button type="button" className={styles.linkButton} onClick={() => load(nextCursor)}>
          Ver mais comentários
        </button>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <form className={styles.commentForm} onSubmit={handleSubmit}>
        <input
          aria-label="Escreva um comentário"
          placeholder="Escreva um comentário..."
          maxLength={MAX_COMMENT_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className={styles.primary} disabled={sending || !text.trim()}>
          Enviar
        </button>
      </form>
    </section>
  );
}
