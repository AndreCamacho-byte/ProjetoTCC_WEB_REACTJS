import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/moderation", () => ({
  moderationService: {
    report: vi.fn(),
    block: vi.fn(),
    unblock: vi.fn(),
    listBlocked: vi.fn(),
    listReports: vi.fn(),
    updateReport: vi.fn(),
  },
}));
vi.mock("@/services/community", () => ({
  communityService: {
    getProfile: vi.fn(),
    getProfilePosts: vi.fn(),
    deletePost: vi.fn(),
    deleteComment: vi.fn(),
  },
}));
vi.mock("@/services/admin", () => ({ adminService: { updateUser: vi.fn() } }));

import { communityService } from "@/services/community";
import { adminService } from "@/services/admin";
import { moderationService, type Report } from "@/services/moderation";
import { renderAt } from "@/test/helpers";
import type { Post, Profile } from "@/types/community";
import { AdminReportsPage } from "./AdminReportsPage";
import { PostCard } from "./community/PostCard";
import { ProfilePage } from "./community/ProfilePage";

// Denunciar e bloquear, vistos pela tela

const author = { id: "22222222-2222-4222-8222-222222222222", name: "Leticia Teste", username: "leticia", avatarUrl: null, skateLevel: null };

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    content: "Sessão de hoje",
    imageUrls: [],
    createdAt: new Date().toISOString(),
    author,
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    savedByMe: false,
    canDelete: false,
    isMine: false,
    ...overrides,
  };
}

const profile: Profile = {
  ...author,
  bio: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  followers: 3,
  following: 1,
  posts: 1,
  followedByMe: true,
  followsMe: true,
  isMe: false,
  blockedByMe: false,
};

beforeEach(() => {
  vi.mocked(communityService.getProfilePosts).mockResolvedValue({ posts: [], nextCursor: null });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("denunciar", () => {
  it("denuncia um post escolhendo o motivo", async () => {
    vi.mocked(moderationService.report).mockResolvedValue({ message: "ok" });
    renderAt(<PostCard post={makePost()} onDeleted={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Denunciar post" }));
    const dialog = screen.getByRole("dialog", { name: "Denunciar o post de @leticia" });

    // Sem motivo não envia
    await userEvent.click(screen.getByRole("button", { name: "Denunciar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha um motivo.");
    expect(moderationService.report).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("radio", { name: "Spam ou propaganda" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Detalhes (opcional)" }), "  link estranho ");
    await userEvent.click(screen.getByRole("button", { name: "Denunciar" }));

    expect(moderationService.report).toHaveBeenCalledWith({
      targetType: "POST",
      targetId: "post-1",
      reason: "SPAM",
      details: "link estranho",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Denúncia enviada");
    expect(dialog).toBeInTheDocument();
  });

  it("o próprio post não tem botão de denunciar", () => {
    renderAt(<PostCard post={makePost({ isMine: true, canDelete: true })} onDeleted={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Denunciar post" })).not.toBeInTheDocument();
  });
});

describe("bloquear pelo perfil", () => {
  it("bloqueia, esconde os posts e mostra o aviso", async () => {
    vi.mocked(communityService.getProfile)
      .mockResolvedValueOnce(profile)
      .mockResolvedValue({ ...profile, followedByMe: false, followsMe: false, followers: 2, blockedByMe: true });
    vi.mocked(moderationService.block).mockResolvedValue({ blockedByMe: true });
    renderAt(<ProfilePage />, { path: "/u/:username", route: "/u/leticia" });

    await userEvent.click(await screen.findByRole("button", { name: "Bloquear" }));

    expect(window.confirm).toHaveBeenCalled();
    expect(moderationService.block).toHaveBeenCalledWith("leticia");
    expect(await screen.findByText(/Você bloqueou esta pessoa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desbloquear" })).toBeInTheDocument();
    // Sem botão de seguir nem de mensagem enquanto estiver bloqueado
    expect(screen.queryByRole("button", { name: /Seguir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mensagem" })).not.toBeInTheDocument();
  });

  it("perfil de quem bloqueou você aparece como indisponível", async () => {
    const { ApiError } = await import("@/services/api");
    vi.mocked(communityService.getProfile).mockRejectedValue(new ApiError("Perfil não encontrado", 404));
    renderAt(<ProfilePage />, { path: "/u/:username", route: "/u/leticia" });
    expect(await screen.findByRole("alert")).toHaveTextContent("não existe ou não está disponível");
  });
});

describe("painel de denúncias", () => {
  const report: Report = {
    id: "r1",
    targetType: "POST",
    targetId: "post-1",
    reason: "OFENSA",
    details: "xingou todo mundo",
    excerpt: "texto ofensivo",
    status: "ABERTA",
    createdAt: "2026-11-01T12:00:00.000Z",
    resolvedAt: null,
    reporter: { id: "ana", name: "Ana", username: "ana", suspendedAt: null },
    reportedUser: { id: author.id, name: author.name, username: author.username, suspendedAt: null },
    targetExists: true,
    postId: "post-1",
  };

  it("mostra o trecho e quem foi denunciado, e apagar o post resolve a denúncia", async () => {
    vi.mocked(moderationService.listReports).mockResolvedValueOnce([report]).mockResolvedValue([]);
    vi.mocked(communityService.deletePost).mockResolvedValue(null);
    vi.mocked(moderationService.updateReport).mockResolvedValue({ id: "r1", status: "RESOLVIDA" });
    renderAt(<AdminReportsPage />);

    expect(await screen.findByText("“texto ofensivo”")).toBeInTheDocument();
    expect(screen.getByText(/Denunciado: Leticia Teste \(@leticia\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir post" })).toHaveAttribute("href", "/comunidade/post/post-1");

    await userEvent.click(screen.getByRole("button", { name: "Apagar post" }));

    await waitFor(() => expect(moderationService.updateReport).toHaveBeenCalledWith("r1", "RESOLVIDA"));
    expect(communityService.deletePost).toHaveBeenCalledWith("post-1");
    expect(await screen.findByText("Nenhuma denúncia esperando análise.")).toBeInTheDocument();
  });

  it("suspende a conta denunciada", async () => {
    vi.mocked(moderationService.listReports).mockResolvedValue([report]);
    vi.mocked(adminService.updateUser).mockResolvedValue({} as never);
    vi.mocked(moderationService.updateReport).mockResolvedValue({ id: "r1", status: "RESOLVIDA" });
    renderAt(<AdminReportsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Suspender conta" }));

    await waitFor(() => expect(adminService.updateUser).toHaveBeenCalledWith(author.id, { suspended: true }));
  });
});
