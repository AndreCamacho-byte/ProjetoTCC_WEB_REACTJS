import { lazy, type ComponentType, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { AgeGate } from "./components/AgeGate";
import { AdminRoute, PrivateRoute, PublicOnlyRoute } from "./components/RouteGuards";
import { NAV_LINKS } from "./components/SiteHeader";
import { SiteLayout } from "./layouts/SiteLayout";
import { CheckEmailPage } from "./pages/CheckEmailPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { ConfirmEmailPage } from "./pages/ConfirmEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

// As áreas grandes (mapa, loja, comunidade, chat, painel) são baixadas só quando a pessoa abre:
// a primeira tela carrega bem mais rápido, principalmente no 4G. A página inicial e as telas de
// login ficam no pacote principal, porque são as primeiras que todo mundo vê.
// (o SiteLayout mostra um aviso de "carregando" enquanto a área chega)
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const AccountSettingsPage = page(() => import("./pages/AccountSettingsPage"), "AccountSettingsPage");
const AdminOrdersPage = page(() => import("./pages/AdminOrdersPage"), "AdminOrdersPage");
const AdminProductsPage = page(() => import("./pages/AdminProductsPage"), "AdminProductsPage");
const AdminSpotsPage = page(() => import("./pages/AdminSpotsPage"), "AdminSpotsPage");
const AdminReportsPage = page(() => import("./pages/AdminReportsPage"), "AdminReportsPage");
const AdminUsersPage = page(() => import("./pages/AdminUsersPage"), "AdminUsersPage");
const ChatPage = page(() => import("./pages/chat/ChatPage"), "ChatPage");
const CommunityPage = page(() => import("./pages/community/CommunityPage"), "CommunityPage");
const PostPage = page(() => import("./pages/community/PostPage"), "PostPage");
const ProfilePage = page(() => import("./pages/community/ProfilePage"), "ProfilePage");
const SavedPage = page(() => import("./pages/community/SavedPage"), "SavedPage");
const CartPage = page(() => import("./pages/market/CartPage"), "CartPage");
const CheckoutPage = page(() => import("./pages/market/CheckoutPage"), "CheckoutPage");
const MarketPage = page(() => import("./pages/market/MarketPage"), "MarketPage");
const OrderPage = page(() => import("./pages/market/OrdersPage"), "OrderPage");
const OrdersPage = page(() => import("./pages/market/OrdersPage"), "OrdersPage");
const ProductPage = page(() => import("./pages/market/ProductPage"), "ProductPage");
const PrivacyPage = page(() => import("./pages/PrivacyPage"), "PrivacyPage");
const EventsPage = page(() => import("./pages/spots/EventsPage"), "EventsPage");
const ExplorePage = page(() => import("./pages/spots/ExplorePage"), "ExplorePage");
const MeetupPage = page(() => import("./pages/spots/MeetupPage"), "MeetupPage");
const NewSpotPage = page(() => import("./pages/spots/NewSpotPage"), "NewSpotPage");
const SpotPage = page(() => import("./pages/spots/SpotPage"), "SpotPage");
const TermsPage = page(() => import("./pages/TermsPage"), "TermsPage");

// Áreas com idade mínima de 13 anos: spots (Explorar), encontros (Eventos) e marketplace
const AGE_RESTRICTED = ["/explorar", "/eventos", "/market"];

// Páginas de cada seção do menu (uma seção sem página aqui mostra "Em breve")
const READY: Record<string, ReactNode> = {
  "/explorar": <ExplorePage />,
  "/comunidade": <CommunityPage />,
  "/market": <MarketPage />,
  "/eventos": <EventsPage />,
};

// Telas de spots e encontros: idade mínima; a própria página mostra um convite para quem não entrou
const spotArea = (area: string, page: ReactNode) => <AgeGate area={area}>{page}</AgeGate>;

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
                (READY[link.to] ?? <ComingSoonPage title={link.label} />)
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
        <Route path="/explorar/novo" element={spotArea("Explorar", <NewSpotPage />)} />
        <Route path="/explorar/spot/:id" element={spotArea("Explorar", <SpotPage />)} />
        <Route path="/eventos/:id" element={spotArea("Eventos", <MeetupPage />)} />
        <Route path="/market/carrinho" element={buyer(<CartPage />)} />
        <Route path="/market/finalizar" element={buyer(<CheckoutPage />)} />
        <Route path="/market/pedidos" element={buyer(<OrdersPage />)} />
        <Route path="/market/pedidos/:id" element={buyer(<OrderPage />)} />
        <Route
          path="/u/:username"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/comunidade/post/:id"
          element={
            <PrivateRoute>
              <PostPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/salvos"
          element={
            <PrivateRoute>
              <SavedPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/mensagens"
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/mensagens/:id"
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          }
        />
        <Route path="/termos" element={<TermsPage />} />
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
          path="/admin/spots"
          element={
            <AdminRoute>
              <AdminSpotsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/denuncias"
          element={
            <AdminRoute>
              <AdminReportsPage />
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
