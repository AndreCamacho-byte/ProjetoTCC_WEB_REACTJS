import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
// O mapa de verdade (Leaflet) precisa de um navegador; nos testes entra uma versão simples
vi.mock("./SpotMap", () => ({
  DEFAULT_CENTER: { lat: 0, lng: 0 },
  locateMe: vi.fn(),
  SpotMap: ({ label, onPick }: { label: string; onPick?: (p: { lat: number; lng: number }) => void }) => (
    <button type="button" aria-label={label} onClick={() => onPick?.({ lat: -23.55, lng: -46.63 })} />
  ),
}));
vi.mock("@/services/spots", () => ({
  spotService: {
    list: vi.fn(),
    mine: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    createMeetup: vi.fn(),
    upcomingMeetups: vi.fn(),
    myMeetups: vi.fn(),
    getMeetup: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    cancel: vi.fn(),
    forReview: vi.fn(),
    review: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { spotService } from "@/services/spots";
import { makeUser, renderAt } from "@/test/helpers";
import type { Meetup, MeetupDetail, Spot } from "@/types/spot";
import { AdminSpotsPage } from "../AdminSpotsPage";
import { EventsPage } from "./EventsPage";
import { ExplorePage } from "./ExplorePage";
import { MeetupPage } from "./MeetupPage";
import { NewSpotPage } from "./NewSpotPage";
import { SpotPage } from "./SpotPage";

const service = vi.mocked(spotService);
const ana = { id: "ana-id", name: "Ana", username: "ana", avatarUrl: null, skateLevel: null };
const SPOT_ID = "33333333-3333-4333-8333-333333333333";
const MEETUP_ID = "44444444-4444-4444-8444-444444444444";

const loggedIn = (overrides = {}) =>
  vi.mocked(useAuth).mockReturnValue({
    user: makeUser(overrides),
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
  });

function makeMeetup(overrides: Partial<Meetup> = {}): Meetup {
  return {
    id: MEETUP_ID,
    title: "Sessão de sábado",
    description: null,
    startsAt: "2026-10-25T18:00:00.000Z",
    maxParticipants: null,
    participantCount: 3,
    full: false,
    cancelled: false,
    started: false,
    spot: { id: SPOT_ID, name: "Praça Roosevelt", address: null, type: "STREET" },
    creator: ana,
    joinedByMe: false,
    isCreator: false,
    canCancel: false,
    ...overrides,
  };
}

const detail = (overrides: Partial<MeetupDetail> = {}): MeetupDetail => ({ ...makeMeetup(), participants: [ana], ...overrides });

function makeSpot(overrides: Partial<Spot> = {}): Spot {
  return {
    id: SPOT_ID,
    name: "Praça Roosevelt",
    description: "Bancos e escadas",
    type: "STREET",
    address: "Consolação, São Paulo",
    latitude: -23.55,
    longitude: -46.64,
    status: "APROVADO",
    imageUrls: [],
    createdBy: ana,
    createdAt: "2026-10-20T12:00:00.000Z",
    canDelete: false,
    meetups: [makeMeetup()],
    ...overrides,
  };
}

beforeEach(() => {
  loggedIn();
});

describe("Explorar", () => {
  it("visitante vê o convite para entrar", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() });
    renderAt(<ExplorePage />, { path: "/explorar" });

    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
    expect(service.list).not.toHaveBeenCalled();
  });

  it("lista os spots do mapa e as sugestões pendentes", async () => {
    service.list.mockResolvedValue([
      { id: SPOT_ID, name: "Praça Roosevelt", type: "STREET", address: null, latitude: 1, longitude: 2, coverUrl: null, upcomingMeetups: 2 },
    ]);
    service.mine.mockResolvedValue([
      { id: "p1", name: "Pico novo", type: "DIY", address: null, status: "PENDENTE", coverUrl: null, createdAt: "2026-10-21T00:00:00.000Z" },
    ]);
    renderAt(<ExplorePage />, { path: "/explorar" });

    expect(await screen.findByRole("link", { name: /Praça Roosevelt/ })).toHaveAttribute("href", `/explorar/spot/${SPOT_ID}`);
    expect(screen.getByText("2 encontros marcados")).toBeInTheDocument();
    expect(screen.getByText("Aguardando aprovação")).toBeInTheDocument();
  });
});

describe("sugerir spot", () => {
  it("pede para marcar o lugar no mapa antes de enviar", async () => {
    renderAt(<NewSpotPage />, { path: "/explorar/novo" });

    await userEvent.type(screen.getByLabelText("Nome do spot"), "Pico novo");
    await userEvent.click(screen.getByRole("button", { name: "Enviar sugestão" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Clique no mapa");
    expect(service.create).not.toHaveBeenCalled();
  });

  it("envia a sugestão com o lugar escolhido e agradece", async () => {
    service.create.mockResolvedValue({ id: SPOT_ID, status: "PENDENTE" });
    renderAt(<NewSpotPage />, { path: "/explorar/novo" });

    await userEvent.type(screen.getByLabelText("Nome do spot"), "Pico novo");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "DIY");
    await userEvent.click(screen.getByRole("button", { name: "Marque o spot no mapa" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar sugestão" }));

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Pico novo", type: "DIY", latitude: -23.55, longitude: -46.63, images: [] }),
    );
    expect(await screen.findByText("Valeu pela dica!")).toBeInTheDocument();
  });
});

describe("página do spot", () => {
  it("mostra os encontros e o botão de marcar", async () => {
    service.get.mockResolvedValue(makeSpot());
    renderAt(<SpotPage />, { path: "/explorar/spot/:id", route: `/explorar/spot/${SPOT_ID}` });

    expect(await screen.findByRole("heading", { name: "Praça Roosevelt" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sessão de sábado/ })).toHaveAttribute("href", `/eventos/${MEETUP_ID}`);
    expect(screen.getByRole("button", { name: "Marcar encontro" })).toBeInTheDocument();
  });

  it("spot pendente avisa que espera aprovação e não deixa marcar encontro", async () => {
    service.get.mockResolvedValue(makeSpot({ status: "PENDENTE", meetups: [], canDelete: true }));
    renderAt(<SpotPage />, { path: "/explorar/spot/:id", route: `/explorar/spot/${SPOT_ID}` });

    expect(await screen.findByText(/esperando a aprovação/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar encontro" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apagar spot" })).toBeInTheDocument();
  });

  it("cria o encontro com limite e abre a página dele", async () => {
    service.get.mockResolvedValue(makeSpot({ meetups: [] }));
    service.createMeetup.mockResolvedValue(makeMeetup());
    renderAt(<SpotPage />, { path: "/explorar/spot/:id", route: `/explorar/spot/${SPOT_ID}` });

    await userEvent.click(await screen.findByRole("button", { name: "Marcar encontro" }));
    await userEvent.type(screen.getByLabelText("Nome do encontro"), "Sessão de sábado");
    await userEvent.type(screen.getByLabelText("Data e hora"), "2026-10-25T15:00");
    await userEvent.click(screen.getByLabelText("Limitar o número de pessoas"));
    await userEvent.click(screen.getByRole("button", { name: "Criar encontro" }));

    expect(service.createMeetup).toHaveBeenCalledWith(
      SPOT_ID,
      expect.objectContaining({ title: "Sessão de sábado", maxParticipants: 10 }),
    );
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(`/eventos/${MEETUP_ID}`));
  });
});

describe("encontro", () => {
  const open = () => renderAt(<MeetupPage />, { path: "/eventos/:id", route: `/eventos/${MEETUP_ID}` });

  it("confirma presença", async () => {
    service.getMeetup.mockResolvedValue(detail());
    service.join.mockResolvedValue(detail({ joinedByMe: true, participantCount: 4 }));
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Vou nessa" }));

    expect(service.join).toHaveBeenCalledWith(MEETUP_ID);
    expect(await screen.findByRole("button", { name: "Não vou mais" })).toBeInTheDocument();
  });

  it("encontro lotado não deixa confirmar", async () => {
    service.getMeetup.mockResolvedValue(detail({ full: true, maxParticipants: 3 }));
    open();

    expect(await screen.findByRole("button", { name: "Lotado" })).toBeDisabled();
  });

  it("mostra o erro do servidor", async () => {
    service.getMeetup.mockResolvedValue(detail());
    service.join.mockRejectedValue(new ApiError("Esse encontro já está lotado", 409, [], "MEETUP_FULL"));
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Vou nessa" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("lotado");
  });

  it("quem criou só desmarca a ida e pode confirmar de novo depois", async () => {
    service.getMeetup.mockResolvedValue(detail({ joinedByMe: true, isCreator: true }));
    service.leave.mockResolvedValue(detail({ joinedByMe: false, isCreator: true, participantCount: 2 }));
    open();

    // Sem botão de cancelar para todos: isso é só da equipe
    expect(screen.queryByRole("button", { name: /Cancelar para todos/ })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Não vou mais" }));

    expect(service.leave).toHaveBeenCalledWith(MEETUP_ID);
    expect(service.cancel).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Vou nessa" })).toBeEnabled();
  });

  it("a equipe pode cancelar para todos, depois de confirmar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    service.getMeetup.mockResolvedValue(detail({ joinedByMe: true, isCreator: true, canCancel: true }));
    service.cancel.mockResolvedValue(detail({ joinedByMe: true, isCreator: true, cancelled: true }));
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Cancelar para todos (equipe)" }));

    expect(service.cancel).toHaveBeenCalledWith(MEETUP_ID);
    expect(await screen.findByText("Este encontro foi cancelado.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Não vou mais" })).not.toBeInTheDocument();
  });
});

describe("Eventos", () => {
  it("mostra os próximos e, na outra aba, os meus (com os cancelados)", async () => {
    service.upcomingMeetups.mockResolvedValue([makeMeetup()]);
    service.myMeetups.mockResolvedValue([makeMeetup({ cancelled: true, joinedByMe: true })]);
    renderAt(<EventsPage />, { path: "/eventos" });

    expect(await screen.findByText(/Praça Roosevelt · 3 confirmados/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Meus encontros" }));
    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
  });
});

describe("painel: spots", () => {
  it("aprova uma sugestão e recarrega a fila", async () => {
    loggedIn({ role: "ADMIN" });
    service.forReview.mockResolvedValueOnce([
      {
        id: SPOT_ID,
        name: "Pico novo",
        description: null,
        type: "DIY",
        address: null,
        latitude: 1,
        longitude: 2,
        status: "PENDENTE",
        imageUrls: [],
        createdBy: { id: "ana-id", name: "Ana", username: "ana" },
        createdAt: "2026-10-21T00:00:00.000Z",
      },
    ]);
    service.forReview.mockResolvedValueOnce([]);
    service.review.mockResolvedValue({ id: SPOT_ID, status: "APROVADO" });
    renderAt(<AdminSpotsPage />, { path: "/admin/spots" });

    expect(await screen.findByText(/Sugerido por Ana \(@ana\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(service.review).toHaveBeenCalledWith(SPOT_ID, "APROVADO");
    expect(await screen.findByText("Nenhuma sugestão esperando aprovação.")).toBeInTheDocument();
  });
});
