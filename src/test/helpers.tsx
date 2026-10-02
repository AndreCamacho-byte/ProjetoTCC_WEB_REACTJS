import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { User } from "@/types/user";

// Usuário de exemplo. Passe só os campos que importam para o teste.
export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Tony Teste",
    username: "tony",
    email: "tony@clutch.test",
    avatarUrl: null,
    bio: null,
    skateLevel: null,
    role: "USER",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    birthDate: "2000-01-15T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// Mostra em que endereço o teste está, para conferir redirecionamentos
function CurrentLocation() {
  const location = useLocation();
  return (
    <span data-testid="location" data-state={JSON.stringify(location.state)}>
      {location.pathname}
    </span>
  );
}

// Renderiza uma tela dentro do roteador, começando no endereço informado.
// Qualquer outro endereço cai em uma página vazia, e `location` mostra onde o teste foi parar.
export function renderAt(ui: ReactElement, { path = "/", route = path, state }: { path?: string; route?: string; state?: unknown } = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: route.split("?")[0], search: route.includes("?") ? `?${route.split("?")[1]}` : "", state }]}>
      <CurrentLocation />
      <Routes>
        <Route path={path} element={ui} />
        <Route path="*" element={<p>outra página</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
