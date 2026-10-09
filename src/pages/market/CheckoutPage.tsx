import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ChevronLeftIcon } from "@/components/icons";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/services/api";
import { marketService } from "@/services/market";
import type { Address } from "@/types/market";
import { formatBRL, formatCep } from "@/utils/format";
import { apiMessage, type FormErrors } from "@/utils/validation";
import styles from "./Market.module.css";

const STATES = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

type Field = "recipientName" | "zipCode" | "street" | "addressNumber" | "district" | "city" | "state";

// Mesmas regras do backend (market.controller.ts), para avisar antes de enviar
export function validateAddress(address: Address) {
  const errors: FormErrors<Field> = {};
  if (address.recipientName.trim().length < 2) errors.recipientName = "Informe o nome de quem vai receber";
  if (address.zipCode.replace(/\D/g, "").length !== 8) errors.zipCode = "O CEP tem 8 dígitos";
  if (address.street.trim().length < 2) errors.street = "Informe a rua";
  if (!address.addressNumber.trim()) errors.addressNumber = "Informe o número";
  if (address.district.trim().length < 2) errors.district = "Informe o bairro";
  if (address.city.trim().length < 2) errors.city = "Informe a cidade";
  if (!STATES.includes(address.state)) errors.state = "Escolha o estado";
  return errors;
}

// Finalizar compra: endereço de entrega e confirmação. O pagamento é simulado (projeto acadêmico).
export function CheckoutPage() {
  usePageTitle("Finalizar compra");

  const { user } = useAuth();
  const { cart, setCart, refresh } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState<Address>({
    recipientName: user?.name ?? "",
    zipCode: "",
    street: "",
    addressNumber: "",
    complement: "",
    district: "",
    city: "",
    state: "",
  });
  const [errors, setErrors] = useState<FormErrors<Field>>({});
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    marketService
      .getCart()
      .then(setCart)
      .catch((err) => setError(apiMessage(err)))
      .finally(() => setLoaded(true));
  }, [setCart]);

  const set = (field: keyof Address) => (value: string) => setAddress((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateAddress(address);
    setErrors(found);
    setError("");
    if (Object.keys(found).length > 0) return;

    setSending(true);
    try {
      const order = await marketService.createOrder({ ...address, complement: address.complement?.trim() || undefined });
      await refresh();
      navigate(`/market/pedidos/${order.id}`, { replace: true, state: { justCreated: true } });
    } catch (err) {
      if (err instanceof ApiError && err.details.length > 0) {
        setErrors(Object.fromEntries(err.details.map((detail) => [detail.field, detail.message])));
      } else {
        setError(apiMessage(err));
      }
      setSending(false);
    }
  }

  if (!loaded) {
    return (
      <div className={styles.page}>
        <p className={styles.empty}>Carregando...</p>
      </div>
    );
  }

  // Sem nada para comprar (ou com item indisponível), a pessoa volta para o carrinho
  if (!sending && cart && (cart.items.length === 0 || cart.items.some((item) => !item.available))) {
    return <Navigate to="/market/carrinho" replace />;
  }

  return (
    <div className={styles.page}>
      <Link to="/market/carrinho" className={styles.backLink}>
        <ChevronLeftIcon size={16} /> Voltar para o carrinho
      </Link>
      <h1 className={styles.title} style={{ marginBottom: 20 }}>
        Finalizar compra
      </h1>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <form className={styles.split} onSubmit={handleSubmit} noValidate>
        <section className={styles.panel}>
          <h2>Endereço de entrega</h2>
          <div className={styles.form}>
            <TextField
              label="Nome de quem vai receber"
              autoComplete="name"
              maxLength={80}
              value={address.recipientName}
              onChange={(e) => set("recipientName")(e.target.value)}
              error={errors.recipientName}
            />
            <div className={styles.third}>
              <TextField
                label="CEP"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                value={address.zipCode}
                onChange={(e) => set("zipCode")(formatCep(e.target.value))}
                error={errors.zipCode}
              />
            </div>
            <div className={styles.twoThirds}>
              <TextField
                label="Rua"
                autoComplete="address-line1"
                maxLength={120}
                value={address.street}
                onChange={(e) => set("street")(e.target.value)}
                error={errors.street}
              />
            </div>
            <div className={styles.third}>
              <TextField
                label="Número"
                maxLength={10}
                value={address.addressNumber}
                onChange={(e) => set("addressNumber")(e.target.value)}
                error={errors.addressNumber}
              />
            </div>
            <div className={styles.twoThirds}>
              <TextField
                label="Complemento (opcional)"
                autoComplete="address-line2"
                maxLength={60}
                value={address.complement ?? ""}
                onChange={(e) => set("complement")(e.target.value)}
              />
            </div>
            <div className={styles.half}>
              <TextField
                label="Bairro"
                maxLength={60}
                value={address.district}
                onChange={(e) => set("district")(e.target.value)}
                error={errors.district}
              />
            </div>
            <div className={styles.third}>
              <TextField
                label="Cidade"
                autoComplete="address-level2"
                maxLength={60}
                value={address.city}
                onChange={(e) => set("city")(e.target.value)}
                error={errors.city}
              />
            </div>
            <label className={`${styles.selectField} ${styles.uf}`}>
              UF
              <select
                aria-label="Estado"
                autoComplete="address-level1"
                value={address.state}
                onChange={(e) => set("state")(e.target.value)}
                aria-invalid={errors.state ? true : undefined}
              >
                <option value="">--</option>
                {STATES.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            </label>
            {errors.state && (
              <p className={styles.itemWarning} style={{ margin: 0 }}>
                {errors.state}
              </p>
            )}
          </div>
        </section>

        <aside className={styles.panel}>
          <h2>Seu pedido</h2>
          {cart?.items.map((item) => (
            <p key={item.variantId} className={styles.summaryRow}>
              <span>
                {item.quantity}× {item.product.name} ({item.size})
              </span>
              <span>{formatBRL(item.subtotal)}</span>
            </p>
          ))}
          <p className={styles.summaryRow}>
            <span>Frete</span>
            <span>Grátis</span>
          </p>
          <p className={`${styles.summaryRow} ${styles.summaryTotal}`}>
            <span>Total</span>
            <span>{formatBRL(cart?.total ?? 0)}</span>
          </p>
          <p className={styles.notice}>
            <strong>Pagamento simulado.</strong> O Clutch é um projeto acadêmico: nenhum valor é cobrado e nenhum produto é
            enviado de verdade.
          </p>
          <button type="submit" className={`${styles.primary} ${styles.block}`} disabled={sending}>
            {sending ? "Confirmando..." : "Confirmar pedido"}
          </button>
        </aside>
      </form>
    </div>
  );
}
