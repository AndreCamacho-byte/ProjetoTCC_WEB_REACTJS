import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SearchIcon } from "@/components/icons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { marketService } from "@/services/market";
import type { Brand, Product, ProductPage } from "@/types/market";
import { formatBRL } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Market.module.css";
import { ProductPhoto } from "./shared";

// Vitrine da loja. A busca, a marca e a página ficam no endereço (?busca=...&marca=...&pagina=2),
// então dá para compartilhar o link e o botão de voltar do navegador funciona.
export function MarketPage() {
  usePageTitle("Market");

  const [params, setParams] = useSearchParams();
  const search = params.get("busca") ?? "";
  const brandId = params.get("marca") ?? "";
  const page = Math.max(1, Number(params.get("pagina")) || 1);

  const [text, setText] = useState(search);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [data, setData] = useState<ProductPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => setText(search), [search]);

  useEffect(() => {
    marketService.listBrands().then(setBrands, () => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    marketService
      .listProducts({ search, brandId, page })
      .then((result) => !ignore && setData(result))
      .catch((err) => !ignore && setError(apiMessage(err)))
      .finally(() => !ignore && setLoading(false));
    // Se a busca mudar antes de a resposta chegar, a resposta antiga é descartada
    return () => {
      ignore = true;
    };
  }, [search, brandId, page]);

  // Muda um filtro e volta para a primeira página
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "pagina") next.delete("pagina");
    setParams(next);
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    change("busca", text.trim());
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtering = search !== "" || brandId !== "";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Market</p>
          <h1 className={styles.title}>Streetwear das marcas parceiras</h1>
        </div>
        <form className={styles.search} role="search" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Buscar produto ou marca"
            aria-label="Buscar na loja"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" aria-label="Buscar">
            <SearchIcon size={18} />
          </button>
        </form>
      </header>

      {brands.length > 1 && (
        <div className={styles.filters} role="group" aria-label="Filtrar por marca">
          <button type="button" className={brandId ? styles.chip : styles.chipActive} onClick={() => change("marca", "")}>
            Todas
          </button>
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              className={brand.id === brandId ? styles.chipActive : styles.chip}
              aria-pressed={brand.id === brandId}
              onClick={() => change("marca", brand.id)}
            >
              {brand.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {!data && loading && <p className={styles.empty}>Carregando...</p>}

      {data && data.products.length === 0 && (
        <div className={styles.empty}>
          <p>{filtering ? "Nenhum produto encontrado com esse filtro." : "A loja ainda não tem produtos. Volte logo!"}</p>
          {filtering && (
            <button type="button" className={styles.secondary} onClick={() => setParams({})}>
              Ver todos os produtos
            </button>
          )}
        </div>
      )}

      {data && data.products.length > 0 && (
        <ul className={styles.grid}>
          {data.products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      {data && totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Páginas">
          <button type="button" disabled={page <= 1 || loading} onClick={() => change("pagina", String(page - 1))}>
            Anterior
          </button>
          <span>
            Página {data.page} de {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => change("pagina", String(page + 1))}>
            Próxima
          </button>
        </nav>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const soldOut = product.variants.every((variant) => variant.stock === 0);

  return (
    <Link to={`/market/produto/${product.id}`} className={styles.card}>
      <div style={{ position: "relative" }}>
        <ProductPhoto url={product.images[0]?.url} name={product.name} brandName={product.brand.name} />
        {soldOut && <span className={styles.soldOut}>Esgotado</span>}
      </div>
      <p className={styles.cardBrand}>{product.brand.name}</p>
      <h2 className={styles.cardName}>{product.name}</h2>
      <p className={styles.cardPrice}>{formatBRL(product.price)}</p>
    </Link>
  );
}
