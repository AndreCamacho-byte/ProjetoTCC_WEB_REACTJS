import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/market", () => ({ marketService: { listProducts: vi.fn() } }));
vi.mock("@/services/community", () => ({ communityService: { searchProfiles: vi.fn() } }));
vi.mock("@/services/spots", () => ({ spotService: { list: vi.fn() } }));

import { useAuth } from "@/hooks/useAuth";
import { communityService } from "@/services/community";
import { marketService } from "@/services/market";
import { spotService } from "@/services/spots";
import { makeUser, renderAt } from "@/test/helpers";
import type { Product } from "@/types/market";
import type { SpotPin } from "@/types/spot";
import { SearchPage } from "./SearchPage";

const market = vi.mocked(marketService);
const community = vi.mocked(communityService);
const spots = vi.mocked(spotService);

const product: Product = {
  id: "p1",
  name: "Shape Praça 8.0",
  description: "",
  price: 250,
  active: true,
  brand: { id: "b1", name: "Clutch" },
  images: [],
  variants: [{ id: "v1", size: "Único", stock: 3 }],
  category: "SHAPE",
  details: [],
  faq: [],
  location: null,
  createdAt: "2026-10-01T00:00:00.000Z",
} as Product;

const spot = (id: string, name: string, address: string | null = null): SpotPin =>
  ({ id, name, type: "STREET", address, latitude: 0, longitude: 0, coverUrl: null, upcomingMeetups: 0 }) as SpotPin;

const auth = (user: ReturnType<typeof makeUser> | null) =>
  vi.mocked(useAuth).mockReturnValue({ user, loading: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() });

const open = (q: string) => renderAt(<SearchPage />, { path: "/busca", route: `/busca?q=${encodeURIComponent(q)}` });

beforeEach(() => {
  market.listProducts.mockResolvedValue({ products: [product], total: 1, page: 1, pageSize: 12 });
  community.searchProfiles.mockResolvedValue([
    { id: "u1", name: "Leticia", username: "leti", avatarUrl: null, skateLevel: null },
  ]);
  spots.list.mockResolvedValue([spot("s1", "Praça Roosevelt", "Centro, São Paulo"), spot("s2", "Pista do Ibirapuera")]);
});

describe("Busca do cabeçalho", () => {
  it("logado: mostra skatistas, spots (sem ligar para acento) e produtos", async () => {
    auth(makeUser());
    open("praca");

    expect(await screen.findByRole("link", { name: /Leticia/ })).toHaveAttribute("href", "/u/leti");
    expect(screen.getByRole("link", { name: /Praça Roosevelt/ })).toHaveAttribute("href", "/explorar/spot/s1");
    expect(screen.queryByText("Pista do Ibirapuera")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shape Praça 8.0/ })).toHaveAttribute("href", "/market/produto/p1");
    expect(community.searchProfiles).toHaveBeenCalledWith("praca");
    expect(market.listProducts).toHaveBeenCalledWith({ search: "praca" });
    expect(document.title).toBe("Busca: praca | Clutch");
  });

  it("visitante: só busca na loja e convida para entrar", async () => {
    auth(null);
    open("shape");

    expect(await screen.findByRole("link", { name: /Shape Praça 8.0/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Entre na sua conta" })).toHaveLength(2);
    expect(community.searchProfiles).not.toHaveBeenCalled();
    expect(spots.list).not.toHaveBeenCalled();
  });

  it("menor de 13: busca só pessoas (loja e spots ficam de fora)", async () => {
    const young = new Date();
    young.setFullYear(young.getFullYear() - 10);
    auth(makeUser({ birthDate: young.toISOString() }));
    open("leti");

    expect(await screen.findByRole("link", { name: /Leticia/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Loja/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Spots/ })).not.toBeInTheDocument();
    expect(market.listProducts).not.toHaveBeenCalled();
    expect(spots.list).not.toHaveBeenCalled();
  });

  it("avisa quando nada é encontrado e quando uma parte falha", async () => {
    auth(makeUser());
    market.listProducts.mockResolvedValue({ products: [], total: 0, page: 1, pageSize: 12 });
    community.searchProfiles.mockRejectedValue(new Error("fora do ar"));
    spots.list.mockResolvedValue([]);
    open("zzz");

    expect(await screen.findByText("Não foi possível buscar aqui agora.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum produto encontrado.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum spot com esse nome ou endereço.")).toBeInTheDocument();
  });

  it("muitos produtos: link para ver todos na loja", async () => {
    auth(null);
    market.listProducts.mockResolvedValue({ products: [product], total: 30, page: 1, pageSize: 12 });
    open("shape");

    expect(await screen.findByRole("link", { name: "Ver todos os 30 na loja" })).toHaveAttribute(
      "href",
      "/market?busca=shape",
    );
  });
});
