import { useCallback, useEffect, useRef, useState } from "react";
import type { Post, PostPage } from "@/types/community";
import { apiMessage } from "@/utils/validation";
import styles from "./Community.module.css";
import { PostCard } from "./PostCard";

type Props = {
  // Busca uma página de posts. Quando ela muda (ex.: troca de aba), a lista recomeça.
  load: (cursor?: string) => Promise<PostPage>;
  emptyText: string;
  // Post recém-criado, que entra no topo sem recarregar a lista
  newPost?: Post | null;
  // Na tela de salvos: o post some da lista quando a pessoa tira dos salvos
  removeOnUnsave?: boolean;
};

// Lista de posts com o botão "Carregar mais" (usada no feed e no perfil)
export function PostList({ load, emptyText, newPost, removeOnUnsave = false }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Número do pedido mais recente: a resposta de um pedido antigo (ex.: da aba que a pessoa já
  // trocou) é ignorada, para não misturar posts nem mostrar um erro que já não vale
  const latest = useRef(0);

  const fetchPage = useCallback(
    async (cursor?: string) => {
      const request = ++latest.current;
      setLoading(true);
      setError("");
      try {
        const page = await load(cursor);
        if (request !== latest.current) return;
        setPosts((current) => (cursor ? [...current, ...page.posts] : page.posts));
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (request === latest.current) setError(apiMessage(err));
      } finally {
        if (request === latest.current) setLoading(false);
      }
    },
    [load],
  );

  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    fetchPage();
    // Ao sair (ou trocar de aba), o pedido em andamento deixa de valer
    return () => {
      latest.current++;
    };
  }, [fetchPage]);

  useEffect(() => {
    if (newPost) setPosts((current) => (current.some((p) => p.id === newPost.id) ? current : [newPost, ...current]));
  }, [newPost]);

  return (
    <>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDeleted={(id) => setPosts((current) => current.filter((p) => p.id !== id))}
          onUnsaved={removeOnUnsave ? (id) => setPosts((current) => current.filter((p) => p.id !== id)) : undefined}
        />
      ))}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!loading && !error && posts.length === 0 && <p className={`${styles.card} ${styles.empty}`}>{emptyText}</p>}
      {loading && <p className={styles.empty}>Carregando...</p>}

      {nextCursor && !loading && (
        <button type="button" className={`${styles.secondary} ${styles.loadMore}`} onClick={() => fetchPage(nextCursor)}>
          Carregar mais
        </button>
      )}
    </>
  );
}
