import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/community", () => ({
  communityService: {
    getFeed: vi.fn(),
    createPost: vi.fn(),
    deletePost: vi.fn(),
    like: vi.fn(),
    unlike: vi.fn(),
    getComments: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    searchProfiles: vi.fn(),
    getProfile: vi.fn(),
    getProfilePosts: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { communityService } from "@/services/community";
import { makeUser, renderAt } from "@/test/helpers";
import type { Comment, Post, Profile } from "@/types/community";
import type { User } from "@/types/user";
import { timeAgo } from "@/utils/format";
import { TermsPage } from "../TermsPage";
import { CommunityPage } from "./CommunityPage";
import { ProfilePage } from "./ProfilePage";

const service = vi.mocked(communityService);

function loginAs(user: User | null) {
  vi.mocked(useAuth).mockReturnValue({ user, loading: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() });
}

const otherAuthor = { id: "22222222-2222-4222-8222-222222222222", name: "Leticia Teste", username: "leticia", avatarUrl: null, skateLevel: "AVANCADO" as const };

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    content: "Sessão de hoje na praça",
    imageUrl: null,
    createdAt: new Date().toISOString(),
    author: otherAuthor,
    likeCount: 3,
    commentCount: 1,
    likedByMe: false,
    canDelete: false,
    ...overrides,
  };
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    content: "Que manobra!",
    createdAt: new Date().toISOString(),
    author: otherAuthor,
    canDelete: false,
    ...overrides,
  };
}

const page = (posts: Post[], nextCursor: string | null = null) => ({ posts, nextCursor });

beforeEach(() => {
  loginAs(makeUser());
});

describe("Comunidade", () => {
  it("convida o visitante a entrar", () => {
    loginAs(null);
    renderAt(<CommunityPage />, { path: "/comunidade" });

    expect(screen.getByRole("heading", { name: "A galera do skate está aqui" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    expect(service.getFeed).not.toHaveBeenCalled();
  });

  it("mostra o feed com autor, nível, curtidas e comentários", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    renderAt(<CommunityPage />, { path: "/comunidade" });

    const post = (await screen.findByText("Sessão de hoje na praça")).closest("article")!;
    expect(within(post).getByRole("link", { name: "Leticia Teste" })).toHaveAttribute("href", "/u/leticia");
    expect(within(post).getByText("Avançado")).toBeInTheDocument();
    expect(within(post).getByRole("button", { name: "Curtir" })).toHaveTextContent("3");
    expect(within(post).queryByRole("button", { name: /Apagar/ })).not.toBeInTheDocument();
  });

  it("troca para o feed de quem a pessoa segue", async () => {
    service.getFeed.mockResolvedValue(page([]));
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("tab", { name: "Seguindo" }));

    await waitFor(() => expect(service.getFeed).toHaveBeenLastCalledWith("following", undefined));
    expect(await screen.findByText(/Os posts de quem você segue aparecem aqui/)).toBeInTheDocument();
  });

  it("ignora a resposta atrasada da aba anterior", async () => {
    let failAll: (reason: unknown) => void = () => {};
    service.getFeed.mockImplementation((feed) =>
      feed === "all"
        ? new Promise((_resolve, reject) => {
            failAll = reject;
          })
        : Promise.resolve(page([makePost({ content: "Post de quem eu sigo" })])),
    );
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("tab", { name: "Seguindo" }));
    expect(await screen.findByText("Post de quem eu sigo")).toBeInTheDocument();

    // A busca da aba "Todos" falha só agora, depois da troca
    failAll(new ApiError("Nossos servidores estão fora do ar.", 503));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("carrega mais posts pelo cursor", async () => {
    service.getFeed.mockResolvedValueOnce(page([makePost()], "post-1")).mockResolvedValueOnce(page([makePost({ id: "post-2", content: "Segundo post" })]));
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: "Carregar mais" }));

    expect(await screen.findByText("Segundo post")).toBeInTheDocument();
    expect(service.getFeed).toHaveBeenLastCalledWith("all", "post-1");
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument();
  });

  it("publica um post e ele aparece no topo", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    service.createPost.mockResolvedValue(makePost({ id: "post-novo", content: "Meu primeiro post", canDelete: true }));
    renderAt(<CommunityPage />, { path: "/comunidade" });

    const postButton = await screen.findByRole("button", { name: "Postar" });
    expect(postButton).toBeDisabled();

    await userEvent.type(screen.getByRole("textbox", { name: "Escreva um post" }), "  Meu primeiro post ");
    await userEvent.click(postButton);

    await waitFor(() => expect(service.createPost).toHaveBeenCalledWith("Meu primeiro post", undefined));
    const articles = await screen.findAllByRole("article");
    expect(within(articles[0]).getByText("Meu primeiro post")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Escreva um post" })).toHaveValue("");
  });

  it("curte na hora e desfaz se o servidor falhar", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    service.like.mockRejectedValue(new ApiError("Post não encontrado", 404));
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: "Curtir" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Post não encontrado");
    expect(screen.getByRole("button", { name: "Curtir" })).toHaveTextContent("3");
  });

  it("curte e mostra a contagem do servidor", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    service.like.mockResolvedValue({ likeCount: 4, likedByMe: true });
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: "Curtir" }));

    const button = await screen.findByRole("button", { name: "Descurtir" });
    expect(button).toHaveTextContent("4");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("abre os comentários e comenta", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    service.getComments.mockResolvedValue({ comments: [makeComment()], nextCursor: null });
    service.createComment.mockResolvedValue(makeComment({ id: "comment-2", content: "Brabo demais", canDelete: true }));
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: "Comentários" }));
    expect(await screen.findByText("Que manobra!")).toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox", { name: "Escreva um comentário" }), "Brabo demais");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("Brabo demais")).toBeInTheDocument();
    expect(service.createComment).toHaveBeenCalledWith("post-1", "Brabo demais");
    expect(screen.getByRole("button", { name: "Comentários" })).toHaveTextContent("2");
  });

  it("apaga o próprio post depois de confirmar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    service.getFeed.mockResolvedValue(page([makePost({ canDelete: true })]));
    service.deletePost.mockResolvedValue(null);
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: /Apagar/ }));

    await waitFor(() => expect(screen.queryByText("Sessão de hoje na praça")).not.toBeInTheDocument());
    expect(service.deletePost).toHaveBeenCalledWith("post-1");
  });

  it("busca pessoas para seguir", async () => {
    service.getFeed.mockResolvedValue(page([]));
    service.searchProfiles.mockResolvedValue([otherAuthor]);
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.type(await screen.findByRole("searchbox", { name: "Buscar pessoas" }), "leti{Enter}");

    expect(await screen.findByRole("link", { name: /Leticia Teste/ })).toHaveAttribute("href", "/u/leticia");
    expect(service.searchProfiles).toHaveBeenCalledWith("leti");
  });
});

describe("Perfil", () => {
  const profile: Profile = {
    ...otherAuthor,
    bio: "Ando desde 2015",
    createdAt: "2026-01-01T00:00:00.000Z",
    followers: 10,
    following: 2,
    posts: 1,
    followedByMe: false,
    isMe: false,
  };

  const open = () => renderAt(<ProfilePage />, { path: "/u/:username", route: "/u/leticia" });

  it("mostra bio, nível e contadores", async () => {
    service.getProfile.mockResolvedValue(profile);
    service.getProfilePosts.mockResolvedValue(page([makePost()]));
    open();

    expect(await screen.findByRole("heading", { name: /Leticia Teste/ })).toBeInTheDocument();
    expect(screen.getByText("Ando desde 2015")).toBeInTheDocument();
    expect(screen.getByText("seguidores", { exact: false })).toHaveTextContent("10 seguidores");
    expect(await screen.findByText("Sessão de hoje na praça")).toBeInTheDocument();
    expect(service.getProfilePosts).toHaveBeenCalledWith("leticia", undefined);
  });

  it("segue e atualiza o número de seguidores", async () => {
    service.getProfile.mockResolvedValue(profile);
    service.getProfilePosts.mockResolvedValue(page([]));
    service.follow.mockResolvedValue({ followers: 11, followedByMe: true });
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Seguir" }));

    expect(await screen.findByRole("button", { name: "Seguindo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("seguidores", { exact: false })).toHaveTextContent("11 seguidores");
  });

  it("no próprio perfil, mostra o link para editar", async () => {
    service.getProfile.mockResolvedValue({ ...profile, isMe: true });
    service.getProfilePosts.mockResolvedValue(page([]));
    open();

    expect(await screen.findByRole("link", { name: "Editar perfil" })).toHaveAttribute("href", "/conta");
    expect(screen.queryByRole("button", { name: "Seguir" })).not.toBeInTheDocument();
  });

  it("avisa quando o perfil não existe", async () => {
    service.getProfile.mockRejectedValue(new ApiError("Perfil não encontrado", 404));
    open();

    expect(await screen.findByRole("alert")).toHaveTextContent("Este perfil não existe ou não está disponível.");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-14T12:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it("descreve há quanto tempo foi", () => {
    expect(timeAgo(ago(20 * 1000), now)).toBe("agora");
    expect(timeAgo(ago(5 * 60 * 1000), now)).toBe("há 5 min");
    expect(timeAgo(ago(3 * 3600 * 1000), now)).toBe("há 3 h");
    expect(timeAgo(ago(26 * 3600 * 1000), now)).toBe("há 1 dia");
    expect(timeAgo(ago(3 * 86400 * 1000), now)).toBe("há 3 dias");
    expect(timeAgo("2026-09-01T12:00:00.000Z", now)).toBe("01/09/2026");
  });
});

describe("Termos de Uso", () => {
  it("traz as regras da comunidade e o aviso da loja simulada", () => {
    renderAt(<TermsPage />, { path: "/termos" });

    expect(screen.getByRole("heading", { name: "Termos de Uso" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3. Regras da comunidade" })).toBeInTheDocument();
    expect(screen.getByText(/as compras são simuladas/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "/privacidade");
  });
});
