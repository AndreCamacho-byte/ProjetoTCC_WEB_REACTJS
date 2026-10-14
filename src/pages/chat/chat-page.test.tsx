import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/services/chat", () => ({
  CHAT_READ_EVENT: "clutch:chat-read",
  notifyChatRead: vi.fn(),
  chatService: {
    listFriends: vi.fn(),
    listConversations: vi.fn(),
    unreadCount: vi.fn(),
    open: vi.fn(),
    get: vi.fn(),
    getMessages: vi.fn(),
    send: vi.fn(),
    markRead: vi.fn(),
    sharePost: vi.fn(),
  },
}));

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { chatService } from "@/services/chat";
import { makeUser, renderAt } from "@/test/helpers";
import type { ConversationSummary, Message } from "@/types/chat";
import { ChatPage } from "./ChatPage";

const service = vi.mocked(chatService);
const bia = { id: "bia-id", name: "Bia Teste", username: "bia", avatarUrl: null, skateLevel: null };

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "m1",
    content: "Bora na pista?",
    mine: false,
    createdAt: new Date().toISOString(),
    sharedPost: false,
    post: null,
    ...overrides,
  };
}

const summary: ConversationSummary = {
  id: "c1",
  other: bia,
  unread: 2,
  lastMessage: { content: "Bora na pista?", sharedPost: false, mine: false, createdAt: new Date().toISOString() },
};

const openList = () => renderAt(<ChatPage />, { path: "/mensagens" });
const openThread = () => renderAt(<ChatPage />, { path: "/mensagens/:id", route: "/mensagens/c1" });

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ user: makeUser(), loading: false, signIn: vi.fn(), signOut: vi.fn(), updateUser: vi.fn() });
  service.listConversations.mockResolvedValue([summary]);
  service.markRead.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("lista de conversas", () => {
  it("mostra cada conversa com a última mensagem e as não lidas", async () => {
    openList();

    const item = await screen.findByRole("link", { name: /Bia Teste/ });
    expect(item).toHaveAttribute("href", "/mensagens/c1");
    expect(within(item).getByText("Bora na pista?")).toBeInTheDocument();
    expect(within(item).getByLabelText("2 não lidas")).toHaveTextContent("2");
  });

  it("explica quando ainda não há conversas", async () => {
    service.listConversations.mockResolvedValue([]);
    openList();

    expect(await screen.findByText(/Nenhuma conversa ainda/)).toBeInTheDocument();
  });

  it("começa uma conversa nova escolhendo um amigo", async () => {
    service.listFriends.mockResolvedValue([bia]);
    service.open.mockResolvedValue({ id: "c9", other: bia, canSend: true });
    openList();

    await userEvent.click(await screen.findByRole("button", { name: "Nova conversa" }));
    await userEvent.click(await screen.findByRole("button", { name: /Bia Teste/ }));

    expect(service.open).toHaveBeenCalledWith("bia");
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/mensagens/c9"));
  });

  it("mostra quando a última mensagem foi minha ou um post", async () => {
    service.listConversations.mockResolvedValue([
      { ...summary, unread: 0, lastMessage: { content: "", sharedPost: true, mine: true, createdAt: new Date().toISOString() } },
    ]);
    openList();

    expect(await screen.findByText("Você: Compartilhou um post")).toBeInTheDocument();
  });
});

describe("conversa aberta", () => {
  beforeEach(() => {
    service.get.mockResolvedValue({ id: "c1", other: bia, canSend: true });
  });

  it("mostra as mensagens e marca como lida", async () => {
    service.getMessages.mockResolvedValue({ messages: [makeMessage(), makeMessage({ id: "m2", content: "Bora!", mine: true })], nextCursor: null });
    openThread();

    expect(await screen.findByText("Bora!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bia Teste" })).toHaveAttribute("href", "/u/bia");
    await waitFor(() => expect(service.markRead).toHaveBeenCalledWith("c1"));
  });

  it("manda mensagem com Enter", async () => {
    service.getMessages.mockResolvedValue({ messages: [makeMessage()], nextCursor: null });
    service.send.mockResolvedValue(makeMessage({ id: "m2", content: "Bora sim", mine: true }));
    openThread();

    await userEvent.type(await screen.findByRole("textbox", { name: "Mensagem para Bia Teste" }), "Bora sim{Enter}");

    expect(service.send).toHaveBeenCalledWith("c1", "Bora sim");
    expect(await screen.findByText("Bora sim")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Mensagem para Bia Teste" })).toHaveValue("");
  });

  it("Shift+Enter pula linha em vez de mandar", async () => {
    service.getMessages.mockResolvedValue({ messages: [], nextCursor: null });
    openThread();

    const box = await screen.findByRole("textbox", { name: "Mensagem para Bia Teste" });
    await userEvent.type(box, "linha 1{Shift>}{Enter}{/Shift}linha 2");

    expect(box).toHaveValue("linha 1\nlinha 2");
    expect(service.send).not.toHaveBeenCalled();
  });

  it("mostra o post compartilhado e avisa quando ele foi apagado", async () => {
    service.getMessages.mockResolvedValue({
      messages: [
        makeMessage({
          id: "p1",
          content: "",
          sharedPost: true,
          post: { id: "post-1", excerpt: "Sessão de hoje", imageUrl: null, author: { name: "Ana", username: "ana", avatarUrl: null } },
        }),
        makeMessage({ id: "p2", content: "", sharedPost: true, post: null }),
      ],
      nextCursor: null,
    });
    openThread();

    expect(await screen.findByRole("link", { name: /Sessão de hoje/ })).toHaveAttribute("href", "/comunidade/post/post-1");
    expect(screen.getByText("Este post não está mais disponível.")).toBeInTheDocument();
  });

  it("quem deixou de ser amigo não pode mandar mensagem", async () => {
    service.get.mockResolvedValue({ id: "c1", other: bia, canSend: false });
    service.getMessages.mockResolvedValue({ messages: [makeMessage()], nextCursor: null });
    openThread();

    expect(await screen.findByText(/Vocês não se seguem mais/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("se a amizade acabar no meio, trava o envio", async () => {
    service.getMessages.mockResolvedValue({ messages: [], nextCursor: null });
    service.send.mockRejectedValue(new ApiError("Vocês precisam se seguir para conversar", 403, [], "NOT_FRIENDS"));
    openThread();

    await userEvent.type(await screen.findByRole("textbox", { name: "Mensagem para Bia Teste" }), "oi{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Vocês precisam se seguir");
    expect(screen.getByText(/Vocês não se seguem mais/)).toBeInTheDocument();
  });

  it("busca sozinha as mensagens que chegam", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    service.getMessages
      .mockResolvedValueOnce({ messages: [makeMessage()], nextCursor: null })
      .mockResolvedValue({ messages: [makeMessage({ id: "m2", content: "Chegou agora" })], nextCursor: null });
    openThread();
    await screen.findByRole("textbox", { name: "Mensagem para Bia Teste" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });

    expect(await screen.findByText("Chegou agora")).toBeInTheDocument();
    expect(service.getMessages).toHaveBeenLastCalledWith("c1", { after: "m1" });
  });

  it("carrega as mensagens anteriores", async () => {
    service.getMessages
      .mockResolvedValueOnce({ messages: [makeMessage({ id: "m5", content: "Recente" })], nextCursor: "m5" })
      .mockResolvedValueOnce({ messages: [makeMessage({ id: "m1", content: "Antiga" })], nextCursor: null });
    openThread();

    await userEvent.click(await screen.findByRole("button", { name: "Ver mensagens anteriores" }));

    expect(await screen.findByText("Antiga")).toBeInTheDocument();
    expect(service.getMessages).toHaveBeenCalledWith("c1", { cursor: "m5" });
    expect(screen.queryByRole("button", { name: "Ver mensagens anteriores" })).not.toBeInTheDocument();
  });

  it("conversa que não é sua mostra que não foi encontrada", async () => {
    service.get.mockRejectedValue(new ApiError("Conversa não encontrada", 404));
    service.getMessages.mockRejectedValue(new ApiError("Conversa não encontrada", 404));
    openThread();

    expect(await screen.findByText("Conversa não encontrada.")).toBeInTheDocument();
  });
});
