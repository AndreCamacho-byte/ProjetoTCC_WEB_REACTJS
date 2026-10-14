import type { SkateLevel } from "./user";

// O que aparece de cada pessoa nos posts, comentários e na busca
export type Author = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  skateLevel: SkateLevel | null;
};

export type Post = {
  id: string;
  content: string;
  // Até 4 fotos, na ordem escolhida
  imageUrls: string[];
  createdAt: string;
  author: Author;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  // Verdadeiro para quem escreveu e para administradores
  canDelete: boolean;
};

// Páginas do feed e dos comentários: nextCursor null = não tem mais
export type PostPage = { posts: Post[]; nextCursor: string | null };

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  canDelete: boolean;
};

export type CommentPage = { comments: Comment[]; nextCursor: string | null };

export type Profile = Author & {
  bio: string | null;
  createdAt: string;
  followers: number;
  following: number;
  posts: number;
  followedByMe: boolean;
  // A pessoa segue quem está vendo ("Segue você"). Os dois juntos = amigos.
  followsMe: boolean;
  isMe: boolean;
};

// Pessoa nas listas de seguidores e de quem alguém segue
export type FollowPerson = Author & { followedByMe: boolean; isMe: boolean };
export type FollowPage = { people: FollowPerson[]; nextCursor: string | null };

export type LikeState = { likeCount: number; likedByMe: boolean };
export type SaveState = { savedByMe: boolean };
export type FollowState = { followers: number; followedByMe: boolean };
