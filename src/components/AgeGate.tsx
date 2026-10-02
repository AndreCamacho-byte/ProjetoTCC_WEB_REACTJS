import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MIN_AGE, ageStatus } from "@/utils/age";

// Regra de idade dos spots/encontros e do marketplace:
// - menor de 12 anos: área bloqueada
// - conta sem data de nascimento (criada antes de o cadastro pedir): bloqueada até informar a data
// Quem não está logado vê a página normalmente. O backend aplica a mesma regra nas rotas
// dessas áreas (middleware requireMinAge), então esconder a tela não é a única proteção.
export function AgeGate({ area, children }: { area: string; children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return children;

  const status = ageStatus(user);
  if (status === "OK") return children;

  return (
    <section
      style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px", textAlign: "center", color: "var(--brand-ink)" }}
    >
      <p
        style={{
          margin: 0,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--brand-red)",
        }}
      >
        {status === "UNVERIFIED" ? "Idade não verificada" : "Acesso restrito"}
      </p>
      <h1 style={{ margin: "8px 0 12px", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800 }}>{area}</h1>

      {status === "UNVERIFIED" ? (
        <>
          <p style={{ margin: "0 0 28px", lineHeight: 1.5 }}>
            Sua conta foi criada antes de pedirmos a data de nascimento. Informe a sua para liberar esta área.
          </p>
          <Link
            to="/conta"
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
            Informar data de nascimento
          </Link>
        </>
      ) : (
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Esta área do Clutch só é liberada a partir dos {MIN_AGE} anos. O resto do site continua disponível para
          você.
        </p>
      )}
    </section>
  );
}
