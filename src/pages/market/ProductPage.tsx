import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BookmarkIcon, ChevronLeftIcon } from "@/components/icons";
import { Lightbox } from "@/components/Lightbox";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/services/api";
import { marketService } from "@/services/market";
import type { Product } from "@/types/market";
import { ageStatus } from "@/utils/age";
import { formatBRL } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Market.module.css";
import { MAX_PER_ITEM, ProductPhoto, Stepper } from "./shared";

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
  // Salvar exige login e a idade da loja (12 anos)
  const canSave = user !== null && ageStatus(user) === "OK";

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

  usePageTitle(product?.name ?? "Market");

  useEffect(() => {
    let ignore = false;
    marketService
      .getProduct(id)
      .then((result) => {
        if (ignore) return;
        setProduct(result);
        // Se só um tamanho tem estoque, já vem escolhido
        const inStock = result.variants.filter((variant) => variant.stock > 0);
        if (inStock.length === 1) setVariantId(inStock[0].id);
      })
      .catch((err) => {
        if (ignore) return;
        // Id inválido (400) ou produto fora da loja (404): os dois são "não existe" para quem visita
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) setNotFound(true);
        else setError(apiMessage(err));
      });
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

  const variant = product.variants.find((v) => v.id === variantId);
  const soldOut = product.variants.every((v) => v.stock === 0);
  // O que já está no carrinho conta para o limite por item
  const inCart = cart?.items.find((item) => item.variantId === variantId)?.quantity ?? 0;
  const max = variant ? Math.max(0, Math.min(MAX_PER_ITEM, variant.stock) - inCart) : 1;

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

  return (
    <div className={styles.page}>
      <Link to="/market" className={styles.backLink}>
        <ChevronLeftIcon size={16} /> Voltar para a loja
      </Link>

      <div className={styles.product}>
        <div>
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
          {photoOpen && (
            <Lightbox
              images={product.images.map((image) => image.url)}
              index={photo}
              alt={product.name}
              onIndexChange={setPhoto}
              onClose={() => setPhotoOpen(false)}
            />
          )}
          {product.images.length > 1 && (
            <div className={styles.thumbs}>
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
        </div>

        <div>
          <p className={styles.kicker}>{product.brand.name}</p>
          <h1 className={styles.productName}>{product.name}</h1>
          <div className={styles.priceRow}>
            <p className={styles.productPrice}>{formatBRL(product.price)}</p>
            {(canSave || !user) && (
              <button
                type="button"
                className={`${styles.saveButton} ${saved ? styles.saveButtonOn : ""}`}
                aria-pressed={saved}
                onClick={toggleSave}
              >
                <BookmarkIcon size={18} filled={saved} />
                {saved ? "Salvo" : "Salvar"}
              </button>
            )}
          </div>

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

          <div className={styles.buyRow}>
            <Stepper value={quantity} max={Math.max(1, max)} disabled={!variant || max === 0} onChange={setQuantity} />
            <button type="button" className={styles.primary} disabled={soldOut || adding || (Boolean(variant) && max === 0)} onClick={addToCart}>
              {soldOut ? "Esgotado" : adding ? "Adicionando..." : "Adicionar ao carrinho"}
            </button>
          </div>

          {variant && (
            <p className={styles.stockHint}>
              {max === 0
                ? "Você já colocou no carrinho o máximo disponível deste tamanho."
                : variant.stock === 1
                  ? "Última unidade deste tamanho."
                  : variant.stock <= 3
                    ? `Últimas ${variant.stock} unidades deste tamanho.`
                    : "Em estoque."}
            </p>
          )}

          <p className={styles.description}>{product.description}</p>
        </div>
      </div>
    </div>
  );
}
