import { Navigate, Route, Routes } from "react-router-dom";
import { AgeGate } from "./components/AgeGate";
import { AdminRoute, PrivateRoute, PublicOnlyRoute } from "./components/RouteGuards";
import { NAV_LINKS } from "./components/SiteHeader";
import { SiteLayout } from "./layouts/SiteLayout";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { CheckEmailPage } from "./pages/CheckEmailPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { ConfirmEmailPage } from "./pages/ConfirmEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

// Áreas com idade mínima de 12 anos: spots (Explorar), encontros (Eventos) e marketplace
const AGE_RESTRICTED = ["/explorar", "/eventos", "/market"];

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
                <AgeGate area={link.label}>
                  <ComingSoonPage title={link.label} />
                </AgeGate>
              ) : (
                <ComingSoonPage title={link.label} />
              )
            }
          />
        ))}
        <Route path="/sobre" element={<ComingSoonPage title="Sobre nós" />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
