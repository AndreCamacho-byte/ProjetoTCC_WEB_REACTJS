import type { Author } from "@/types/community";
import type { Conversation, ConversationSummary, Message, MessagePage } from "@/types/chat";
import { api } from "./api";

// Avisa o cabeçalho que o número de mensagens não lidas mudou (ex.: a pessoa abriu uma conversa)
export const CHAT_READ_EVENT = "clutch:chat-read";
export const notifyChatRead = () => window.dispatchEvent(new Event(CHAT_READ_EVENT));

// Chat entre amigos (pessoas que se seguem)
export const chatService = {
  listFriends: () => api<Author[]>("/friends"),
  listConversations: () => api<ConversationSummary[]>("/chats"),
  unreadCount: () => api<{ count: number }>("/chats/unread-count"),
  // Abre a conversa com um amigo (cria se ainda não existir)
  open: (username: string) => api<Conversation>("/chats", { method: "POST", body: { username } }),
  get: (id: string) => api<Conversation>(`/chats/${id}`),

  // Sem nada: as últimas. `cursor`: as anteriores. `after`: só as que chegaram depois daquela mensagem.
  getMessages: (id: string, { cursor, after }: { cursor?: string; after?: string } = {}) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (after) params.set("after", after);
    return api<MessagePage>(`/chats/${id}/messages?${params}`);
  },
  send: (id: string, content: string, postId?: string) =>
    api<Message>(`/chats/${id}/messages`, { method: "POST", body: { content, postId } }),
  markRead: (id: string) => api<{ ok: boolean }>(`/chats/${id}/read`, { method: "PUT" }),

  // Manda um post para vários amigos de uma vez
  sharePost: (postId: string, usernames: string[], content = "") =>
    api<{ sent: number }>("/chats/share", { method: "POST", body: { postId, usernames, content } }),
};
