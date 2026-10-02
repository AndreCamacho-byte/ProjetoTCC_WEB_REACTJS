import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";

// Página provisória para as seções que ainda vão ser desenvolvidas
export function ComingSoonPage({ title }: { title: string }) {
  usePageTitle(title);

  return (
    <section
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "96px 24px",
        textAlign: "center",
        color: "var(--brand-ink)",
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--brand-red)" }}>
        Em breve
      </p>
      <h1 style={{ margin: "8px 0 12px", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800 }}>{title}</h1>
      <p style={{ margin: "0 0 28px", lineHeight: 1.5 }}>Essa parte do Clutch ainda está sendo construída. Volte logo!</p>
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
