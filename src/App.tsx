import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { AgeGate } from "./components/AgeGate";
import { AdminRoute, PrivateRoute, PublicOnlyRoute } from "./components/RouteGuards";
import { NAV_LINKS } from "./components/SiteHeader";
import { SiteLayout } from "./layouts/SiteLayout";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminProductsPage } from "./pages/AdminProductsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { CheckEmailPage } from "./pages/CheckEmailPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { ConfirmEmailPage } from "./pages/ConfirmEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { CartPage } from "./pages/market/CartPage";
import { CheckoutPage } from "./pages/market/CheckoutPage";
import { MarketPage } from "./pages/market/MarketPage";
import { OrderPage, OrdersPage } from "./pages/market/OrdersPage";
import { ProductPage } from "./pages/market/ProductPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

// Áreas com idade mínima de 12 anos: spots (Explorar), encontros (Eventos) e marketplace
const AGE_RESTRICTED = ["/explorar", "/eventos", "/market"];

// Páginas que já existem; as outras seções do menu ainda mostram "Em breve"
const READY: Record<string, ReactNode> = { "/market": <MarketPage /> };

// Telas da loja que exigem login (carrinho, finalizar compra e pedidos), além da idade mínima
const buyer = (page: ReactNode) => (
  <PrivateRoute>
    <AgeGate area="Market">{page}</AgeGate>
  </PrivateRoute>
);

function App() {
  return (
    <Routes>
      {/* Páginas com cabeçalho e rodapé do site */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        {NAV_LINKS.map((link) => (
          <Route
            key={link.to}
            path={link.to}
            element={
              AGE_RESTRICTED.includes(link.to) ? (
                <AgeGate area={link.label}>{READY[link.to] ?? <ComingSoonPage title={link.label} />}</AgeGate>
              ) : (
                <ComingSoonPage title={link.label} />
              )
            }
          />
        ))}
        <Route
          path="/market/produto/:id"
          element={
            <AgeGate area="Market">
              <ProductPage />
            </AgeGate>
          }
        />
        <Route path="/market/carrinho" element={buyer(<CartPage />)} />
        <Route path="/market/finalizar" element={buyer(<CheckoutPage />)} />
        <Route path="/market/pedidos" element={buyer(<OrdersPage />)} />
        <Route path="/market/pedidos/:id" element={buyer(<OrderPage />)} />
        <Route path="/sobre" element={<ComingSoonPage title="Sobre nós" />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        {/* Qualquer endereço que não existe */}
        <Route path="*" element={<NotFoundPage />} />
        <Route
          path="/conta"
          element={
            <PrivateRoute>
              <AccountSettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/produtos"
          element={
            <AdminRoute>
              <AdminProductsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/pedidos"
          element={
            <AdminRoute>
              <AdminOrdersPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/esqueci-senha"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />
      {/* Sem PublicOnlyRoute: quem está logado em outro aparelho também pode abrir o link do email */}
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route
        path="/verifique-email"
        element={
          <PublicOnlyRoute>
            <CheckEmailPage />
          </PublicOnlyRoute>
        }
      />
      {/* Sem PublicOnlyRoute: ao confirmar, a pessoa já fica logada e vê a mensagem de sucesso aqui */}
      <Route path="/confirmar-email" element={<ConfirmEmailPage />} />
    </Routes>
  );
}

export default App;
