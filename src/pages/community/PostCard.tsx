import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { CommentIcon, HeartIcon, TrashIcon } from "@/components/icons";
import { communityService } from "@/services/community";
import type { Author, Comment, Post } from "@/types/community";
import { SKATE_LEVEL_LABEL, timeAgo } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Community.module.css";

export const MAX_COMMENT_LENGTH = 300;

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

type Props = { post: Post; onDeleted: (id: string) => void };

export function PostCard({ post: initial, onDeleted }: Props) {
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
      {post.imageUrl && <img className={styles.photo} src={post.imageUrl} alt={`Foto postada por ${post.author.name}`} loading="lazy" />}

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
