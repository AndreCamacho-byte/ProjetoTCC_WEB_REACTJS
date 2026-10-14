import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeftIcon } from "@/components/icons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/services/api";
import { communityService } from "@/services/community";
import type { Post } from "@/types/community";
import { apiMessage } from "@/utils/validation";
import styles from "./Community.module.css";
import { PostCard } from "./PostCard";

// Um post sozinho: é o que abre quando alguém recebe o link compartilhado
export function PostPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");

  usePageTitle(post ? `Post de ${post.author.name}` : "Post");

  useEffect(() => {
    let ignore = false;
    communityService.getPost(id).then(
      (result) => !ignore && setPost(result),
      (err) => {
        if (ignore) return;
        const missing = err instanceof ApiError && (err.status === 404 || err.status === 400);
        setError(missing ? "Este post não existe mais ou não está disponível." : apiMessage(err));
      },
    );
    return () => {
      ignore = true;
    };
  }, [id]);

  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${styles.single}`}>
        <div className={styles.main}>
          <Link to="/comunidade" className={styles.back}>
            <ChevronLeftIcon size={16} /> Comunidade
          </Link>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {!post && !error && <p className={styles.empty}>Carregando...</p>}
          {post && <PostCard post={post} onDeleted={() => navigate("/comunidade", { replace: true })} />}
        </div>
      </div>
    </div>
  );
}
