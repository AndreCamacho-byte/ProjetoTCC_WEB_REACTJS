import { Navigate, Route, Routes } from "react-router-dom";
import { PublicOnlyRoute } from "./components/RouteGuards";
import { NAV_LINKS } from "./components/SiteHeader";
import { SiteLayout } from "./layouts/SiteLayout";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

function App() {
  return (
    <Routes>
      {/* Páginas com cabeçalho e rodapé do site */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        {NAV_LINKS.map((link) => (
          <Route key={link.to} path={link.to} element={<ComingSoonPage title={link.label} />} />
        ))}
        <Route path="/sobre" element={<ComingSoonPage title="Sobre nós" />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
