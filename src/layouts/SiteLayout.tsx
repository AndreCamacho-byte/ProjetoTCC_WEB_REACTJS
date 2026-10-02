import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

// Estrutura das páginas do site: cabeçalho, conteúdo da página e rodapé
export function SiteLayout() {
  const { pathname } = useLocation();

  // Ao trocar de página, volta para o topo (senão a página nova abre na rolagem da anterior)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
