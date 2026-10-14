import type { Author } from "./community";

export type Conversation = {
  id: string;
  other: Author;
  // Falso quando deixaram de ser amigos: o histórico continua, mas não dá para mandar mensagem nova
  canSend: boolean;
};

export type ConversationSummary = {
  id: string;
  other: Author;
  unread: number;
  lastMessage: { content: string; sharedPost: boolean; mine: boolean; createdAt: string } | null;
};

export type SharedPostPreview = {
  id: string;
  excerpt: string;
  imageUrl: string | null;
  author: { name: string; username: string; avatarUrl: string | null };
};

export type Message = {
  id: string;
  content: string;
  mine: boolean;
  createdAt: string;
  // A mensagem levava um post; se `post` vier nulo, o post foi apagado
  sharedPost: boolean;
  post: SharedPostPreview | null;
};

export type MessagePage = { messages: Message[]; nextCursor: string | null };
