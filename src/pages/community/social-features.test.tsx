import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/utils/image", () => ({ fileToPostPhoto: vi.fn() }));
vi.mock("@/services/chat", () => ({
  CHAT_READ_EVENT: "clutch:chat-read",
  notifyChatRead: vi.fn(),
  chatService: { listFriends: vi.fn(), sharePost: vi.fn(), open: vi.fn() },
}));
vi.mock("@/services/community", () => ({
  communityService: {
    getFeed: vi.fn(),
    createPost: vi.fn(),
    deletePost: vi.fn(),
    like: vi.fn(),
    unlike: vi.fn(),
    save: vi.fn(),
    unsave: vi.fn(),
    getSaved: vi.fn(),
    getPost: vi.fn(),
    getComments: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    searchProfiles: vi.fn(),
    getProfile: vi.fn(),
    getProfilePosts: vi.fn(),
    getFollowers: vi.fn(),
    getFollowing: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { chatService } from "@/services/chat";
import { communityService } from "@/services/community";
import { makeUser, renderAt } from "@/test/helpers";
import type { Post, Profile } from "@/types/community";
import { fileToPostPhoto } from "@/utils/image";
import { CommunityPage } from "./CommunityPage";
import { PostPage } from "./PostPage";
import { ProfilePage } from "./ProfilePage";
import { SavedPage } from "./SavedPage";

const service = vi.mocked(communityService);
const author = { id: "22222222-2222-4222-8222-222222222222", name: "Leticia Teste", username: "leticia", avatarUrl: "/api/users/x/avatar", skateLevel: null };

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
    ...overrides,
  };
}

const page = (posts: Post[]) => ({ posts, nextCursor: null });

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: makeUser(), loading: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() });
});

describe("várias fotos no post", () => {
  const image = (name: string) => new File(["x"], name, { type: "image/jpeg" });

  it("anexa várias fotos de uma vez e manda todas no post", async () => {
    service.getFeed.mockResolvedValue(page([]));
    vi.mocked(fileToPostPhoto).mockImplementation(async (file) => `data:image/jpeg;base64,${file.name}`);
    service.createPost.mockResolvedValue(makePost({ id: "novo" }));
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.upload(await screen.findByLabelText("Escolher fotos para o post"), [image("a"), image("b"), image("c")]);

    expect(await screen.findAllByRole("img", { name: /escolhida para o post/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: /Fotos \(3\/4\)/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tirar a foto 2" }));
    await userEvent.click(screen.getByRole("button", { name: "Postar" }));

    await waitFor(() =>
      expect(service.createPost).toHaveBeenCalledWith("", ["data:image/jpeg;base64,a", "data:image/jpeg;base64,c"]),
    );
  });

  it("aceita no máximo 4 fotos e avisa", async () => {
    service.getFeed.mockResolvedValue(page([]));
    vi.mocked(fileToPostPhoto).mockImplementation(async (file) => `data:image/jpeg;base64,${file.name}`);
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.upload(await screen.findByLabelText("Escolher fotos para o post"), ["1", "2", "3", "4", "5"].map(image));

    expect(await screen.findAllByRole("img", { name: /escolhida para o post/ })).toHaveLength(4);
    expect(screen.getByRole("alert")).toHaveTextContent("até 4 fotos");
    expect(screen.getByRole("button", { name: /Fotos \(4\/4\)/ })).toBeDisabled();
  });

  it("mostra uma foto por vez, passa com as setas e amplia ao clicar", async () => {
    service.getFeed.mockResolvedValue(page([makePost({ imageUrls: ["/f1.jpg", "/f2.jpg"] })]));
    renderAt(<CommunityPage />, { path: "/comunidade" });

    expect(await screen.findByRole("img", { name: /Foto 1 de 2/ })).toHaveAttribute("src", "/f1.jpg");
    expect(screen.queryByRole("button", { name: "Foto anterior" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Próxima foto" }));
    expect(screen.getByRole("img", { name: /Foto 2 de 2/ })).toHaveAttribute("src", "/f2.jpg");

    await userEvent.click(screen.getByRole("button", { name: /Ampliar/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("salvar e compartilhar posts", () => {
  it("salva o post", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    service.save.mockResolvedValue({ savedByMe: true });
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("button", { name: "Tirar dos salvos" })).toHaveAttribute("aria-pressed", "true");
    expect(service.save).toHaveBeenCalledWith("post-1");
  });

  it("na tela de salvos, o post sai da lista ao tirar dos salvos", async () => {
    service.getSaved.mockResolvedValue(page([makePost({ savedByMe: true })]));
    service.unsave.mockResolvedValue({ savedByMe: false });
    renderAt(<SavedPage />, { path: "/salvos" });

    await userEvent.click(await screen.findByRole("button", { name: "Tirar dos salvos" }));

    await waitFor(() => expect(screen.queryByText("Sessão de hoje")).not.toBeInTheDocument());
  });

  it("no computador, copia o link do post", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: "Compartilhar" }));
    expect(screen.getByRole("menuitem", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("/comunidade/post/post-1")),
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Copiar link" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/comunidade/post/post-1`);
    expect(await screen.findByText("Link copiado!")).toBeInTheDocument();
  });

  it("no celular, também oferece o menu de compartilhar do aparelho", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: "Compartilhar" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Compartilhar fora do Clutch" }));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: `${window.location.origin}/comunidade/post/post-1` }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    Reflect.deleteProperty(navigator, "share");
  });

  it("envia o post para amigos escolhidos, com uma mensagem", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    vi.mocked(chatService.listFriends).mockResolvedValue([
      { id: "a", name: "Ana", username: "ana", avatarUrl: null, skateLevel: null },
      { id: "b", name: "Bia", username: "bia", avatarUrl: null, skateLevel: null },
    ]);
    vi.mocked(chatService.sharePost).mockResolvedValue({ sent: 1 });
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: "Compartilhar" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Enviar para amigos" }));

    const dialog = await screen.findByRole("dialog", { name: "Enviar para amigos" });
    const send = within(dialog).getByRole("button", { name: "Enviar" });
    expect(send).toBeDisabled();
    await userEvent.click(await within(dialog).findByRole("checkbox", { name: "Enviar para Bia" }));
    await userEvent.type(within(dialog).getByRole("textbox", { name: /Mensagem junto/ }), "olha isso");
    await userEvent.click(within(dialog).getByRole("button", { name: "Enviar (1)" }));

    expect(chatService.sharePost).toHaveBeenCalledWith("post-1", ["bia"], "olha isso");
    expect(await within(dialog).findByRole("status")).toHaveTextContent("Enviado para 1 amigo");
  });

  it("quem ainda não tem amigos vê uma explicação", async () => {
    service.getFeed.mockResolvedValue(page([makePost()]));
    vi.mocked(chatService.listFriends).mockResolvedValue([]);
    renderAt(<CommunityPage />, { path: "/comunidade" });

    await userEvent.click(await screen.findByRole("button", { name: "Compartilhar" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Enviar para amigos" }));

    expect(await screen.findByText(/ainda não tem amigos no Clutch/)).toBeInTheDocument();
  });

  it("o link compartilhado abre o post", async () => {
    service.getPost.mockResolvedValue(makePost({ content: "Post compartilhado" }));
    renderAt(<PostPage />, { path: "/comunidade/post/:id", route: "/comunidade/post/post-1" });

    expect(await screen.findByText("Post compartilhado")).toBeInTheDocument();
    expect(service.getPost).toHaveBeenCalledWith("post-1");
  });
});

describe("perfil como no Instagram", () => {
  const profile: Profile = {
    ...author,
    bio: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    followers: 2,
    following: 1,
    posts: 0,
    followedByMe: false,
    followsMe: true,
    isMe: false,
  };
  const open = () => renderAt(<ProfilePage />, { path: "/u/:username", route: "/u/leticia" });

  beforeEach(() => {
    service.getProfilePosts.mockResolvedValue(page([]));
  });

  it("mostra 'Segue você' e o botão 'Seguir de volta'", async () => {
    service.getProfile.mockResolvedValue(profile);
    open();

    expect(await screen.findByText("Segue você")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir de volta" })).toBeInTheDocument();
  });

  it("quando os dois se seguem, mostra que são amigos", async () => {
    service.getProfile.mockResolvedValue({ ...profile, followedByMe: true });
    open();

    expect(await screen.findByText("Vocês são amigos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguindo" })).toBeInTheDocument();
  });

  it("amplia a foto de perfil ao clicar", async () => {
    service.getProfile.mockResolvedValue(profile);
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Ver a foto de Leticia Teste ampliada" }));

    expect(within(screen.getByRole("dialog")).getByRole("img", { name: "Foto de Leticia Teste" })).toHaveAttribute("src", author.avatarUrl);
  });

  it("abre a lista de seguidores e segue alguém por ela", async () => {
    service.getProfile.mockResolvedValue(profile);
    service.getFollowers.mockResolvedValue({
      people: [{ id: "ana", name: "Ana", username: "ana", avatarUrl: null, skateLevel: null, followedByMe: false, isMe: false }],
      nextCursor: null,
    });
    service.follow.mockResolvedValue({ followers: 1, followedByMe: true });
    open();

    await userEvent.click(await screen.findByRole("button", { name: /2 seguidores/ }));

    const dialog = await screen.findByRole("dialog", { name: "Seguidores" });
    await userEvent.click(await within(dialog).findByRole("button", { name: "Seguir @ana" }));

    expect(service.follow).toHaveBeenCalledWith("ana");
    expect(await within(dialog).findByRole("button", { name: "Deixar de seguir @ana" })).toHaveTextContent("Seguindo");
    expect(service.getFollowers).toHaveBeenCalledWith("leticia", undefined);
  });

  it("amigos ganham o botão de mensagem, que abre a conversa", async () => {
    service.getProfile.mockResolvedValue({ ...profile, followedByMe: true });
    vi.mocked(chatService.open).mockResolvedValue({ id: "conversa-1", other: author, canSend: true });
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Mensagem" }));

    expect(chatService.open).toHaveBeenCalledWith("leticia");
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/mensagens/conversa-1"));
  });

  it("quem não é amigo não vê o botão de mensagem", async () => {
    service.getProfile.mockResolvedValue(profile);
    open();

    await screen.findByRole("button", { name: "Seguir de volta" });
    expect(screen.queryByRole("button", { name: "Mensagem" })).not.toBeInTheDocument();
  });

  it("abre a lista de quem a pessoa segue", async () => {
    service.getProfile.mockResolvedValue(profile);
    service.getFollowing.mockResolvedValue({ people: [], nextCursor: null });
    open();

    await userEvent.click(await screen.findByRole("button", { name: /1 seguindo/ }));

    expect(await screen.findByText("Este perfil ainda não segue ninguém.")).toBeInTheDocument();
  });
});
