import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { communityService } from "@/services/community";
import { marketService } from "@/services/market";
import { spotService } from "@/services/spots";
import type { Author } from "@/types/community";
import type { Product } from "@/types/market";
import type { SpotPin } from "@/types/spot";
import { ageStatus } from "@/utils/age";
import { SKATE_LEVEL_LABEL, SPOT_TYPE_LABEL } from "@/utils/format";
import { ProductCard } from "./market/ProductCard";
import styles from "./SearchPage.module.css";

const MAX_PRODUCTS = 8;
const MAX_SPOTS = 8;

// Tira acentos e maiúsculas: "Praça" encontra "praca"
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

type Section<T> = { items: T[]; total: number } | "error" | null;

type Results = {
  products: Section<Product>;
  people: Section<Author>;
  spots: Section<SpotPin>;
};

const EMPTY: Results = { products: null, people: null, spots: null };

// Busca do cabeçalho: procura ao mesmo tempo na loja, nas pessoas e nos spots.
// Cada parte segue a regra da sua área: pessoas exigem login; spots e loja exigem 13 anos
// (quem não entrou vê a loja, que é pública, e um convite para as outras partes).
export function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  usePageTitle(query ? `Busca: ${query}` : "Busca");
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);

  const loggedIn = Boolean(user);
  const ageOk = !user || ageStatus(user) === "OK";

  useEffect(() => {
    if (authLoading || !query) {
      setResults(EMPTY);
      return;
    }
    let current = true;
    setLoading(true);

    const section = <T,>(promise: Promise<{ items: T[]; total: number }> | null) =>
      promise ? promise.catch(() => "error" as const) : Promise.resolve(null);

    const term = normalize(query);
    Promise.all([
      section(
        ageOk
          ? marketService
              .listProducts({ search: query })
              .then((page) => ({ items: page.products.slice(0, MAX_PRODUCTS), total: page.total }))
          : null,
      ),
      section(
        loggedIn
          ? communityService.searchProfiles(query).then((people) => ({ items: people, total: people.length }))
          : null,
      ),
      section(
        loggedIn && ageOk
          ? spotService.list().then((spots) => {
              const found = spots.filter((spot) => normalize(`${spot.name} ${spot.address ?? ""}`).includes(term));
              return { items: found.slice(0, MAX_SPOTS), total: found.length };
            })
          : null,
      ),
    ]).then(([products, people, spots]) => {
      if (!current) return;
      setResults({ products, people, spots });
      setLoading(false);
    });

    return () => {
      current = false;
    };
  }, [query, loggedIn, ageOk, authLoading]);

  if (!query) {
    return (
      <section className={styles.page}>
        <p className={styles.kicker}>Busca</p>
        <h1 className={styles.title}>O que você procura?</h1>
        <p className={styles.muted}>Use a barra de busca no topo para procurar produtos, skatistas e spots.</p>
      </section>
    );
  }

  const { products, people, spots } = results;
  const nothing = [products, people, spots].every((part) => part === null || (part !== "error" && part.total === 0));

  return (
    <section className={styles.page}>
      <p className={styles.kicker}>Busca</p>
      <h1 className={styles.title}>Resultados para “{query}”</h1>

      {loading || authLoading ? (
        <p className={styles.muted}>Buscando...</p>
      ) : (
        <>
          {nothing && <p className={styles.muted}>Nada encontrado. Tente outra palavra.</p>}

          <Part
            title="Skatistas"
            result={people}
            emptyText="Ninguém com esse nome ou @."
            invite={!loggedIn && <LoginInvite what="encontrar skatistas" />}
          >
            {people && people !== "error" && people.items.length > 0 && (
              <ul className={styles.people}>
                {people.items.map((person) => (
                  <li key={person.id}>
                    <Link to={`/u/${person.username}`} className={styles.person}>
                      <Avatar user={person} size={40} />
                      <span>
                        <strong>{person.name}</strong>
                        <span className={styles.meta}>
                          @{person.username}
                          {person.skateLevel && ` · ${SKATE_LEVEL_LABEL[person.skateLevel]}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Part>

          <Part
            title="Spots"
            result={spots}
            emptyText="Nenhum spot com esse nome ou endereço."
            invite={!loggedIn && <LoginInvite what="ver os spots" />}
            more={spots && spots !== "error" && spots.total > spots.items.length ? { to: "/explorar", label: "Ver o mapa" } : undefined}
          >
            {spots && spots !== "error" && spots.items.length > 0 && (
              <ul className={styles.spots}>
                {spots.items.map((spot) => (
                  <li key={spot.id}>
                    <Link to={`/explorar/spot/${spot.id}`} className={styles.spot}>
                      <strong>{spot.name}</strong>
                      <span className={styles.meta}>
                        {SPOT_TYPE_LABEL[spot.type]}
                        {spot.address && ` · ${spot.address}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Part>

          <Part
            title="Loja"
            result={products}
            emptyText="Nenhum produto encontrado."
            more={
              products && products !== "error" && products.total > products.items.length
                ? { to: `/market?busca=${encodeURIComponent(query)}`, label: `Ver todos os ${products.total} na loja` }
                : undefined
            }
          >
            {products && products !== "error" && products.items.length > 0 && (
              <ul className={styles.grid}>
                {products.items.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} headingLevel="h3" />
                  </li>
                ))}
              </ul>
            )}
          </Part>
        </>
      )}
    </section>
  );
}

type PartProps<T> = {
  title: string;
  result: Section<T>;
  emptyText: string;
  more?: { to: string; label: string };
  invite?: ReactNode;
  children: ReactNode;
};

// Uma parte dos resultados. Some quando a área não vale para a pessoa (ex.: menor de 13 não vê a loja)
function Part<T>({ title, result, emptyText, more, invite, children }: PartProps<T>) {
  if (result === null && !invite) return null;

  return (
    <div className={styles.part}>
      <div className={styles.partHeader}>
        <h2>
          {title}
          {result && result !== "error" && result.total > 0 && <span className={styles.count}>{result.total}</span>}
        </h2>
        {more && (
          <Link to={more.to} className={styles.more}>
            {more.label}
          </Link>
        )}
      </div>
      {result === "error" && <p className={styles.muted}>Não foi possível buscar aqui agora.</p>}
      {result && result !== "error" && result.total === 0 && <p className={styles.muted}>{emptyText}</p>}
      {result === null && invite}
      {children}
    </div>
  );
}

function LoginInvite({ what }: { what: string }) {
  return (
    <p className={styles.muted}>
      <Link to="/login" className={styles.inlineLink}>
        Entre na sua conta
      </Link>{" "}
      para {what}.
    </p>
  );
}
