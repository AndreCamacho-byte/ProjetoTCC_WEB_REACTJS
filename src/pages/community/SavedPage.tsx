import { useCallback, useEffect, useState } from "react";
import { BookmarkIcon } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { communityService } from "@/services/community";
import { marketService } from "@/services/market";
import type { Product } from "@/types/market";
import { ageStatus, MIN_AGE } from "@/utils/age";
import { apiMessage } from "@/utils/validation";
import marketStyles from "../market/Market.module.css";
import { ProductCard } from "../market/ProductCard";
import styles from "./Community.module.css";
import { PostList } from "./PostList";

type Tab = "posts" | "products";

// Tudo que a pessoa salvou para ver depois: posts da comunidade e produtos da loja
export function SavedPage() {
  usePageTitle("Salvos");

  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("posts");
  const loadPosts = useCallback((cursor?: string) => communityService.getSaved(cursor), []);

  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${styles.single}`}>
        <div className={styles.main}>
          <header>
            <p className={styles.kicker}>Sua coleção</p>
            <h1 className={styles.title}>Salvos</h1>
          </header>

          <div className={styles.tabs} role="tablist" aria-label="O que mostrar">
            <button type="button" role="tab" aria-selected={tab === "posts"} className={tab === "posts" ? styles.tabActive : styles.tab} onClick={() => setTab("posts")}>
              Posts
            </button>
            <button type="button" role="tab" aria-selected={tab === "products"} className={tab === "products" ? styles.tabActive : styles.tab} onClick={() => setTab("products")}>
              Produtos
            </button>
          </div>

          {tab === "posts" && (
            <PostList
              load={loadPosts}
              removeOnUnsave
              emptyText="Você ainda não salvou nenhum post. Toque no marcador embaixo de um post para guardar aqui."
            />
          )}

          {tab === "products" &&
            (user && ageStatus(user) === "OK" ? (
              <SavedProducts />
            ) : (
              <p className={`${styles.card} ${styles.empty}`}>A loja é liberada a partir dos {MIN_AGE} anos.</p>
            ))}
        </div>
      </div>
    </div>
  );
}

function SavedProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    marketService.getSavedProducts().then(setProducts, (err) => setError(apiMessage(err)));
  }, []);

  async function unsave(id: string) {
    try {
      await marketService.unsaveProduct(id);
      setProducts((current) => current?.filter((product) => product.id !== id) ?? null);
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  if (error) {
    return (
      <p className={styles.error} role="alert">
        {error}
      </p>
    );
  }
  if (!products) return <p className={styles.empty}>Carregando...</p>;
  if (products.length === 0) {
    return (
      <p className={`${styles.card} ${styles.empty}`}>
        Nenhum produto salvo. Na página de um produto, use o botão <strong>Salvar</strong>.
      </p>
    );
  }

  return (
    <ul className={marketStyles.grid}>
      {products.map((product) => (
        <li key={product.id} style={{ position: "relative" }}>
          <ProductCard product={product} />
          <button
            type="button"
            className={styles.unsaveProduct}
            aria-label={`Tirar ${product.name} dos salvos`}
            title="Tirar dos salvos"
            onClick={() => unsave(product.id)}
          >
            <BookmarkIcon size={18} filled />
          </button>
        </li>
      ))}
    </ul>
  );
}
