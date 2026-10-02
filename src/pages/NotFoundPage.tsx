import { Link, useLocation } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";

// Mostrada quando o endereço digitado não existe no site
export function NotFoundPage() {
  usePageTitle("Página não encontrada");
  const { pathname } = useLocation();

  return (
    <section
      style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px", textAlign: "center", color: "var(--brand-ink)" }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "clamp(4rem, 14vw, 7rem)",
          lineHeight: 1,
          color: "var(--brand-wine)",
        }}
      >
        404
      </p>
      <h1 style={{ margin: "12px 0", fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 800 }}>
        Essa manobra não encaixou
      </h1>
      <p style={{ margin: "0 0 28px", lineHeight: 1.5, overflowWrap: "anywhere" }}>
        A página <strong>{pathname}</strong> não existe ou mudou de lugar.
      </p>
      <Link
        to="/"
        style={{
          display: "inline-block",
          padding: "10px 28px",
          borderRadius: "var(--radius-md)",
          background: "var(--brand-red)",
          color: "var(--brand-offwhite)",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Voltar para a home
      </Link>
    </section>
  );
}
