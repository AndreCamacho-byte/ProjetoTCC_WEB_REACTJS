import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import type { Product } from "@/types/market";
import { CATEGORY_LABEL, formatBRL, listingDate } from "@/utils/format";
import styles from "./Market.module.css";
import { ProductPhoto } from "./shared";

type Props = { product: Product; headingLevel?: "h2" | "h3" };

// Card de produto: foto, tipo, nome, preço, data do anúncio e local
export function ProductCard({ product, headingLevel = "h2" }: Props) {
  const soldOut = product.variants.every((variant) => variant.stock === 0);
  const Heading = headingLevel;

  return (
    <Link to={`/market/produto/${product.id}`} className={styles.card}>
      <div style={{ position: "relative" }}>
        <ProductPhoto url={product.images[0]?.url} name={product.name} brandName={product.brand.name} />
        {soldOut && <span className={styles.soldOut}>Esgotado</span>}
      </div>
      <span className={styles.categoryPill}>{CATEGORY_LABEL[product.category] ?? CATEGORY_LABEL.OUTRO}</span>
      <Heading className={styles.cardName}>{product.name}</Heading>
      <p className={styles.cardPrice}>{formatBRL(product.price)}</p>
      <p className={styles.cardMeta}>
        {listingDate(product.createdAt)}
        {product.location && (
          <>
            <br />
            {product.location}
          </>
        )}
      </p>
    </Link>
  );
}

type CarouselProps = { title: string; products: Product[]; action?: ReactNode };

// Fileira de produtos que rola para os lados, com as setas do design
export function ProductCarousel({ title, products, action }: CarouselProps) {
  const track = useRef<HTMLUListElement>(null);

  // Cada clique anda quase uma "tela" de cards
  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <section className={styles.carousel} aria-label={title}>
      <header className={styles.carouselHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.carouselActions}>
          {action}
          <button type="button" className={styles.roundArrow} aria-label={`${title}: voltar`} onClick={() => scroll(-1)}>
            <ChevronLeftIcon size={20} />
          </button>
          <button type="button" className={styles.roundArrow} aria-label={`${title}: avançar`} onClick={() => scroll(1)}>
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </header>
      <ul className={styles.carouselTrack} ref={track}>
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} headingLevel="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
