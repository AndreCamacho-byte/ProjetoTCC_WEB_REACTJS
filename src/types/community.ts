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
  imageUrl: string | null;
  createdAt: string;
  author: Author;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
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
  isMe: boolean;
};

export type LikeState = { likeCount: number; likedByMe: boolean };
export type FollowState = { followers: number; followedByMe: boolean };
