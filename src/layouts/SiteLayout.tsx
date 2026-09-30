import { Outlet } from "react-router-dom";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

// Estrutura das páginas do site: cabeçalho, conteúdo da página e rodapé
export function SiteLayout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--brand-offwhite)" }}>
      <SiteHeader />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
