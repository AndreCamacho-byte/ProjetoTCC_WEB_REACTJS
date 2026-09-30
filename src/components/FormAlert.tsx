import type { ReactNode } from "react";

// Mensagem de erro geral do formulário (ex.: "Wrong email or password")
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      style={{
        margin: 0,
        padding: "10px 14px",
        borderRadius: "var(--radius-sm)",
        background: "var(--color-error-bg)",
        color: "var(--color-error)",
        fontSize: "0.8125rem",
        fontWeight: 500,
      }}
    >
      {children}
    </p>
  );
}
