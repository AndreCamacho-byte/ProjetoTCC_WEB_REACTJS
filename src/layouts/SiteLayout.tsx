import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { UsernameGate } from "@/components/UsernameGate";

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
        {/* As áreas grandes do site são baixadas na primeira visita (App.tsx): enquanto isso,
            cabeçalho e rodapé continuam na tela e só o meio mostra o aviso */}
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <UsernameGate />
    </div>
  );
}

function PageLoading() {
  return (
    <p role="status" style={{ padding: "64px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
      Carregando...
    </p>
  );
}
