import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon, TruckIcon } from "@/components/icons";
import { Lightbox } from "@/components/Lightbox";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/services/api";
import { marketService } from "@/services/market";
import type { Product, ProductFaq } from "@/types/market";
import { ageStatus } from "@/utils/age";
import { CATEGORY_LABEL, formatBRL, installments, isOneSize, listingDate } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Market.module.css";
import { ProductCarousel } from "./ProductCard";
import { getRecentProducts, rememberProduct } from "./recentProducts";
import { MAX_PER_ITEM, ProductPhoto, Stepper } from "./shared";

// Tamanho do resumo que aparece ao lado das fotos (o texto completo fica na aba "Descrição")
const SUMMARY_LENGTH = 220;

// Perguntas que valem para todos os produtos (só o que é verdade na loja do Clutch)
const STORE_FAQ: ProductFaq[] = [
  {
    question: "Como funciona o pagamento?",
    answer: "Nesta fase de testes o pagamento é simulado: você fecha o pedido normalmente, mas nenhum valor é cobrado.",
  },
  { question: "Quanto custa o frete?", answer: "O frete é grátis em todos os pedidos." },
  {
    question: "Como acompanho o meu pedido?",
    answer: "Em Meus pedidos você vê a situação de cada compra: pago, enviado e entregue.",
  },
];

type Tab = "descricao" | "detalhes" | "entrega";

export function ProductPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { cart, setCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(0);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);
  // Salvar exige login e a idade da loja (12 anos)
  const canSave = user !== null && ageStatus(user) === "OK";

  usePageTitle(product?.name ?? "Market");

  // Descobre se o produto já está nos salvos de quem está vendo
  useEffect(() => {
    if (!canSave) return;
    let ignore = false;
    marketService.getSavedProducts().then(
      (products) => !ignore && setSaved(products.some((p) => p.id === id)),
      () => {},
    );
    return () => {
      ignore = true;
    };
  }, [canSave, id]);

  useEffect(() => {
    let ignore = false;
    setProduct(null);
    setPhoto(0);
    setVariantId("");
    setQuantity(1);
    setAdded(false);
    setTab(null);

    marketService
      .getProduct(id)
      .then((result) => {
        if (ignore) return;
        setProduct(result);
        // Se só um tamanho tem estoque (ou o produto não tem tamanho), já vem escolhido
        const inStock = result.variants.filter((variant) => variant.stock > 0);
        if (inStock.length === 1) setVariantId(inStock[0].id);
      })
      .catch((err) => {
        if (ignore) return;
        // Id inválido (400) ou produto fora da loja (404): os dois são "não existe" para quem visita
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) setNotFound(true);
        else setError(apiMessage(err));
      });

    // Relacionados e últimas visitas são extras: se falharem, a página continua
    marketService.getRelated(id).then((list) => !ignore && setRelated(list), () => {});
    const recentIds = getRecentProducts().filter((item) => item !== id);
    if (recentIds.length > 0) {
      marketService.listProducts({ ids: recentIds }).then((page) => !ignore && setRecent(page.products), () => {});
    } else {
      setRecent([]);
    }
    rememberProduct(id);

    return () => {
      ignore = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <p>Este produto não está mais disponível.</p>
          <Link to="/market" className={styles.primary}>
            Voltar para a loja
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.page}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          <p className={styles.empty}>Carregando...</p>
        )}
      </div>
    );
  }

  const oneSize = isOneSize(product.variants);
  const variant = product.variants.find((v) => v.id === variantId);
  const soldOut = product.variants.every((v) => v.stock === 0);
  // O que já está no carrinho conta para o limite por item
  const inCart = cart?.items.find((item) => item.variantId === variantId)?.quantity ?? 0;
  const max = variant ? Math.max(0, Math.min(MAX_PER_ITEM, variant.stock) - inCart) : 1;

  // Resumo: o primeiro parágrafo, cortado se for longo
  const firstParagraph = product.description.split(/\n\s*\n/)[0].trim();
  const summary = firstParagraph.length > SUMMARY_LENGTH ? `${firstParagraph.slice(0, SUMMARY_LENGTH).trim()}…` : firstParagraph;
  const hasMoreText = summary !== product.description.trim();

  // Abas que fazem sentido para este produto (a primeira disponível já vem aberta)
  const tabs: { value: Tab; label: string }[] = [
    ...(hasMoreText ? [{ value: "descricao" as const, label: "Descrição" }] : []),
    ...(product.details.length > 0 ? [{ value: "detalhes" as const, label: "Detalhes" }] : []),
    { value: "entrega", label: "Entrega e pagamento" },
  ];
  const activeTab = tab && tabs.some((t) => t.value === tab) ? tab : tabs[0].value;
  const faq = [...product.faq, ...STORE_FAQ];
  // A foto ao lado das abas: a segunda (se houver), para não repetir a principal
  const sideImage = product.images[1]?.url ?? product.images[0]?.url;

  function chooseSize(nextId: string) {
    setVariantId(nextId);
    setQuantity(1);
    setAdded(false);
    setError("");
  }

  async function toggleSave() {
    if (!user) return navigate("/login", { state: { from: location.pathname } });
    const before = saved;
    setSaved(!before);
    try {
      const state = before ? await marketService.unsaveProduct(id) : await marketService.saveProduct(id);
      setSaved(state.savedByMe);
    } catch (err) {
      setSaved(before);
      setError(apiMessage(err));
    }
  }

  async function addToCart() {
    if (!user) {
      // Depois de entrar, a pessoa volta para este produto
      return navigate("/login", { state: { from: location.pathname } });
    }
    if (!variant) return setError("Escolha um tamanho.");

    setAdding(true);
    setError("");
    setAdded(false);
    try {
      setCart(await marketService.setCartItem(variant.id, inCart + quantity));
      setAdded(true);
      setQuantity(1);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setAdding(false);
    }
  }

  const stockText = !variant
    ? ""
    : max === 0
      ? `Você já colocou no carrinho o máximo disponível${oneSize ? "" : " deste tamanho"}.`
      : variant.stock === 1
        ? `Última unidade${oneSize ? "" : " deste tamanho"}.`
        : variant.stock <= 3
          ? `Últimas ${variant.stock} unidades${oneSize ? "" : " deste tamanho"}.`
          : "Em estoque.";

  return (
    <div className={styles.page}>
      <Link to="/market" className={styles.backLink}>
        <ChevronLeftIcon size={16} /> Voltar para a loja
      </Link>

      {/* ---------- Fotos + compra ---------- */}
      <div className={styles.pdTop}>
        <div className={styles.pdGallery}>
          {product.images.length > 1 && (
            <div className={styles.pdThumbs}>
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={index === photo ? styles.thumbActive : styles.thumb}
                  aria-label={`Ver foto ${index + 1}`}
                  aria-pressed={index === photo}
                  onClick={() => setPhoto(index)}
                >
                  <img src={image.url} alt="" />
                </button>
              ))}
            </div>
          )}
          <div className={styles.pdMainPhoto}>
            {product.images.length > 0 ? (
              <button
                type="button"
                className={styles.zoomButton}
                aria-label={`Ampliar a foto de ${product.name}`}
                onClick={() => setPhotoOpen(true)}
              >
                <ProductPhoto url={product.images[photo]?.url} name={product.name} brandName={product.brand.name} />
              </button>
            ) : (
              <ProductPhoto url={undefined} name={product.name} brandName={product.brand.name} />
            )}
          </div>
          {photoOpen && (
            <Lightbox
              images={product.images.map((image) => image.url)}
              index={photo}
              alt={product.name}
              onIndexChange={setPhoto}
              onClose={() => setPhotoOpen(false)}
            />
          )}
        </div>

        <div className={styles.pdInfo}>
          <span className={styles.categoryTag}>{CATEGORY_LABEL[product.category] ?? CATEGORY_LABEL.OUTRO}</span>
          <h1 className={styles.productName}>{product.name}</h1>
          <p className={styles.pdBrand}>
            {product.brand.name}
            {product.location ? ` · ${product.location}` : ""} · {listingDate(product.createdAt)}
          </p>
          <p className={styles.pdPrice}>{formatBRL(product.price)}</p>
          <p className={styles.pdInstallments}>{installments(product.price)}</p>
          <p className={styles.pdSummary}>{summary}</p>

          {!oneSize && (
            <>
              <p className={styles.label} id="size-label">
                Tamanho
              </p>
              <div className={styles.sizes} role="group" aria-labelledby="size-label">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={v.id === variantId ? styles.sizeActive : styles.size}
                    aria-pressed={v.id === variantId}
                    aria-label={v.stock === 0 ? `${v.size} (esgotado)` : v.size}
                    disabled={v.stock === 0}
                    onClick={() => chooseSize(v.id)}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {added && (
            <p className={styles.success} role="status">
              Adicionado ao carrinho. <Link to="/market/carrinho">Ver carrinho</Link>
            </p>
          )}

          <div className={styles.pdQuantityRow}>
            <div className={styles.pdQuantity}>
              <span className={styles.label} style={{ margin: 0 }}>
                Quantidade
              </span>
              <Stepper value={quantity} max={Math.max(1, max)} disabled={!variant || max === 0} onChange={setQuantity} />
            </div>
            {(canSave || !user) && (
              <button
                type="button"
                className={`${styles.pdSave} ${saved ? styles.pdSaveOn : ""}`}
                aria-pressed={saved}
                aria-label={saved ? "Salvo" : "Salvar"}
                title={saved ? "Tirar dos salvos" : "Salvar para depois"}
                onClick={toggleSave}
              >
                <BookmarkIcon size={22} filled={saved} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`${styles.primary} ${styles.pdBuy}`}
            disabled={soldOut || adding || (Boolean(variant) && max === 0)}
            onClick={addToCart}
          >
            {soldOut ? "Esgotado" : adding ? "Adicionando..." : "Adicionar ao carrinho"}
          </button>

          {stockText && <p className={styles.stockHint}>{stockText}</p>}

          <ul className={styles.pdPerks}>
            <li>
              <TruckIcon size={22} />
              <span>
                <strong>Frete grátis</strong>
                em todos os pedidos
              </span>
            </li>
            <li>
              <LockIcon size={22} />
              <span>
                <strong>Compra segura</strong>
                pagamento simulado, nada é cobrado
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* ---------- Abas de detalhes ---------- */}
      <section className={styles.pdDetails}>
        <div>
          <div className={styles.pdTabs} role="tablist" aria-label="Detalhes do produto">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={activeTab === t.value}
                className={activeTab === t.value ? styles.pdTabActive : styles.pdTab}
                onClick={() => setTab(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" className={styles.pdPanel}>
            {activeTab === "descricao" && <p className={styles.pdLongText}>{product.description}</p>}
            {activeTab === "detalhes" && (
              <dl className={styles.pdSpecs}>
                {product.details.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {activeTab === "entrega" && (
              <ul className={styles.pdDelivery}>
                <li>Frete grátis para todos os pedidos.</li>
                <li>Pague à vista ou {installments(product.price).replace(/^ou /, "em ")}.</li>
                <li>Nesta fase de testes o pagamento é simulado: nenhum valor é cobrado.</li>
                <li>Acompanhe a situação do pedido em Meus pedidos.</li>
              </ul>
            )}
          </div>
        </div>
        {sideImage && <img className={styles.pdSideImage} src={sideImage} alt="" loading="lazy" />}
      </section>

      {/* ---------- Perguntas frequentes ---------- */}
      <section className={styles.pdFaq}>
        <h2 className={styles.sectionTitle}>Perguntas frequentes</h2>
        {faq.map((item) => (
          <details key={item.question} className={styles.faqItem}>
            <summary>
              {item.question}
              <ChevronRightIcon size={18} />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>

      <ProductCarousel title="Produtos relacionados" products={related} />
      <ProductCarousel title="Últimas visitas" products={recent} />
    </div>
  );
}
