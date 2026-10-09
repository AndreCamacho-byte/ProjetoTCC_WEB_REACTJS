import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AdminTabs } from "@/components/AdminTabs";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { adminMarketService, marketService } from "@/services/market";
import type { Brand, Product, ProductImage, ProductPage } from "@/types/market";
import { formatBRL, parsePrice } from "@/utils/format";
import { fileToProductPhoto } from "@/utils/image";
import { apiMessage } from "@/utils/validation";
import { Dialog } from "./AdminUsersPage";
import styles from "./AdminUsersPage.module.css";

const MAX_PHOTOS = 5;

// Painel do administrador: produtos e marcas da loja
export function AdminProductsPage() {
  usePageTitle("Produtos · Painel admin");

  const [data, setData] = useState<ProductPage | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // "new" abre o formulário vazio; um produto abre o formulário de edição
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [removing, setRemoving] = useState<Product | null>(null);
  const [showBrands, setShowBrands] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminMarketService.listProducts(query));
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadBrands = useCallback(() => marketService.listBrands().then(setBrands, () => {}), []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setQuery({ search: search.trim(), page: 1 });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className={styles.page}>
      <AdminTabs />
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Administração</p>
          <h1 className={styles.title}>Produtos</h1>
        </div>
        <div className={styles.headerActions}>
          <form className={styles.search} role="search" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Buscar por nome ou marca"
              aria-label="Buscar produtos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" aria-label="Buscar">
              <SearchIcon size={18} />
            </button>
          </form>
          <button type="button" className={styles.secondary} onClick={() => setShowBrands(true)}>
            Marcas
          </button>
          <button type="button" className={styles.primary} onClick={() => setEditing("new")}>
            Novo produto
          </button>
        </div>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Preço</th>
              <th>Tamanhos e estoque</th>
              <th>Na loja</th>
              <th>
                <span className={styles.srOnly}>Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className={styles.productCell}>
                    {product.images[0] ? (
                      <img className={styles.productThumb} src={product.images[0].url} alt="" />
                    ) : (
                      <span className={styles.productThumb} />
                    )}
                    <div>
                      <strong>{product.name}</strong>
                      <span className={styles.handle}>{product.brand.name}</span>
                    </div>
                  </div>
                </td>
                <td>{formatBRL(product.price)}</td>
                <td>{product.variants.map((variant) => `${variant.size}: ${variant.stock}`).join(" · ")}</td>
                <td>
                  <span className={product.active ? styles.badge : styles.badgeOff}>{product.active ? "Sim" : "Desativado"}</span>
                </td>
                <td className={styles.actions}>
                  <button type="button" className={styles.linkButton} onClick={() => setEditing(product)}>
                    Editar
                  </button>
                  <button type="button" className={styles.dangerButton} onClick={() => setRemoving(product)}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
            {data && data.products.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  Nenhum produto cadastrado.
                </td>
              </tr>
            )}
            {!data && loading && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <footer className={styles.footer}>
          <span>
            {data.total} {data.total === 1 ? "produto" : "produtos"}
          </span>
          <div className={styles.pagination}>
            <button type="button" disabled={data.page <= 1 || loading} onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}>
              Anterior
            </button>
            <span>
              Página {data.page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= totalPages || loading}
              onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
            >
              Próxima
            </button>
          </div>
        </footer>
      )}

      {editing && (
        <ProductDialog
          product={editing === "new" ? null : editing}
          brands={brands}
          onChanged={load}
          onClose={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {removing && (
        <RemoveProductDialog
          product={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null);
            load();
          }}
        />
      )}

      {showBrands && <BrandsDialog brands={brands} onChanged={loadBrands} onClose={() => setShowBrands(false)} />}
    </div>
  );
}

type VariantRow = { size: string; stock: string };

type ProductDialogProps = { product: Product | null; brands: Brand[]; onChanged: () => void; onClose: () => void };

function ProductDialog({ product: initial, brands, onChanged, onClose }: ProductDialogProps) {
  // Depois de criar, o formulário continua aberto já em modo de edição, para colocar as fotos
  const [product, setProduct] = useState(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [brandId, setBrandId] = useState(initial?.brand.id ?? brands[0]?.id ?? "");
  const [price, setPrice] = useState(initial ? initial.price.toFixed(2).replace(".", ",") : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [variants, setVariants] = useState<VariantRow[]>(
    initial ? initial.variants.map((v) => ({ size: v.size, stock: String(v.stock) })) : [{ size: "", stock: "" }],
  );
  const [images, setImages] = useState<ProductImage[]>(initial?.images ?? []);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const setVariant = (index: number, change: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    const value = parsePrice(price);
    if (!brandId) return setError("Cadastre uma marca antes (botão Marcas).");
    if (value === null) return setError("Informe o preço, ex.: 119,90");
    if (variants.some((row) => !row.size.trim() || !/^\d+$/.test(row.stock))) {
      return setError("Preencha o tamanho e o estoque (número inteiro) de cada linha.");
    }

    const data = {
      name: name.trim(),
      description: description.trim(),
      price: value,
      brandId,
      active,
      variants: variants.map((row) => ({ size: row.size.trim(), stock: Number(row.stock) })),
    };

    setSaving(true);
    try {
      if (product) {
        setProduct(await adminMarketService.updateProduct(product.id, data));
        setMessage("Produto salvo.");
      } else {
        setProduct(await adminMarketService.createProduct(data));
        setMessage("Produto criado. Agora você pode colocar as fotos.");
      }
      onChanged();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file || !product) return;

    setUploading(true);
    setError("");
    try {
      const image = await adminMarketService.addImage(product.id, await fileToProductPhoto(file));
      setImages((current) => [...current, image]);
    } catch (err) {
      setError(err instanceof Error && err.name === "Error" ? err.message : apiMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(imageId: string) {
    setError("");
    try {
      await adminMarketService.deleteImage(imageId);
      setImages((current) => current.filter((image) => image.id !== imageId));
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  return (
    <Dialog title={product ? "Editar produto" : "Novo produto"} onClose={onClose} wide>
      <form className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}

        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
        </label>

        <div className={styles.formRow}>
          <label>
            Marca
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} required>
              {brands.length === 0 && <option value="">Nenhuma marca cadastrada</option>}
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preço (R$)
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="119,90" required />
          </label>
        </div>

        <label>
          Descrição
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required minLength={2} maxLength={2000} />
        </label>

        <fieldset className={styles.fieldset}>
          <legend>Tamanhos e estoque</legend>
          {variants.map((row, index) => (
            <div key={index} className={styles.variantRow}>
              <input
                aria-label={`Tamanho ${index + 1}`}
                placeholder="Tamanho (ex.: M)"
                maxLength={12}
                value={row.size}
                onChange={(e) => setVariant(index, { size: e.target.value })}
              />
              <input
                aria-label={`Estoque do tamanho ${index + 1}`}
                placeholder="Estoque"
                inputMode="numeric"
                value={row.stock}
                onChange={(e) => setVariant(index, { stock: e.target.value.replace(/\D/g, "") })}
              />
              <button
                type="button"
                className={styles.dangerButton}
                disabled={variants.length === 1}
                onClick={() => setVariants((rows) => rows.filter((_, i) => i !== index))}
              >
                Tirar
              </button>
            </div>
          ))}
          <button type="button" className={styles.linkButton} onClick={() => setVariants((rows) => [...rows, { size: "", stock: "" }])}>
            + Adicionar tamanho
          </button>
        </fieldset>

        <label className={styles.checkbox}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Aparece na loja
        </label>

        <fieldset className={styles.fieldset}>
          <legend>
            Fotos ({images.length}/{MAX_PHOTOS})
          </legend>
          {product ? (
            <div className={styles.photos}>
              {images.map((image, index) => (
                <div key={image.id} className={styles.photoItem}>
                  <img src={image.url} alt={`Foto ${index + 1}`} />
                  <button type="button" aria-label={`Apagar foto ${index + 1}`} onClick={() => removeImage(image.id)}>
                    <CloseIcon size={14} />
                  </button>
                </div>
              ))}
              {images.length < MAX_PHOTOS && (
                <button type="button" className={styles.photoAdd} disabled={uploading} onClick={() => fileInput.current?.click()}>
                  {uploading ? "Enviando..." : "+ Foto"}
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={styles.fileInput}
                onChange={handleFile}
                aria-label="Escolher foto do produto"
              />
            </div>
          ) : (
            <small>Salve o produto para poder colocar as fotos.</small>
          )}
        </fieldset>

        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Fechar
          </button>
          <button type="submit" className={styles.primary} disabled={saving}>
            {saving ? "Salvando..." : product ? "Salvar" : "Criar produto"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

type RemoveProps = { product: Product; onClose: () => void; onRemoved: () => void };

function RemoveProductDialog({ product, onClose, onRemoved }: RemoveProps) {
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setError("");
    setRemoving(true);
    try {
      await adminMarketService.deleteProduct(product.id);
      onRemoved();
    } catch (err) {
      setError(apiMessage(err));
      setRemoving(false);
    }
  }

  return (
    <Dialog title="Remover produto" onClose={onClose}>
      <div className={styles.form}>
        <p>
          Remover <strong>{product.name}</strong>? O produto some da loja e dos carrinhos. Os pedidos já feitos continuam
          registrados. Para só esconder da loja, edite e desmarque "Aparece na loja".
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={styles.danger} onClick={remove} disabled={removing}>
            {removing ? "Removendo..." : "Remover"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

type BrandsProps = { brands: Brand[]; onChanged: () => void; onClose: () => void };

function BrandsDialog({ brands, onChanged, onClose }: BrandsProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) return setError("Informe o nome da marca.");
    run(async () => {
      await adminMarketService.createBrand(name.trim());
      setName("");
    });
  }

  return (
    <Dialog title="Marcas" onClose={onClose}>
      <div className={styles.form}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {brands.length === 0 ? (
          <p>Nenhuma marca cadastrada ainda.</p>
        ) : (
          <ul className={styles.brandList}>
            {brands.map((brand) => (
              <li key={brand.id}>
                {brand.name}
                <button
                  type="button"
                  className={styles.dangerButton}
                  disabled={busy}
                  aria-label={`Apagar a marca ${brand.name}`}
                  onClick={() => run(() => adminMarketService.deleteBrand(brand.id))}
                >
                  Apagar
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className={styles.inlineForm} onSubmit={handleSubmit}>
          <input aria-label="Nome da nova marca" placeholder="Nova marca" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className={styles.primary} disabled={busy}>
            Adicionar
          </button>
        </form>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </Dialog>
  );
}
