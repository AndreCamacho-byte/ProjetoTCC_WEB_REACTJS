import type {
  Author,
  Comment,
  CommentPage,
  FollowPage,
  FollowState,
  LikeState,
  Post,
  PostPage,
  Profile,
  SaveState,
} from "@/types/community";
import { api } from "./api";

export type Feed = "all" | "following";

const page = (cursor?: string, extra: Record<string, string> = {}) => {
  const params = new URLSearchParams(extra);
  if (cursor) params.set("cursor", cursor);
  return params.toString();
};

// Comunidade: tudo exige login
export const communityService = {
  getFeed: (feed: Feed, cursor?: string) => api<PostPage>(`/posts?${page(cursor, { feed })}`),
  // `images`: até 4 fotos já reduzidas, em JPEG (data URL em base64)
  createPost: (content: string, images: string[] = []) => api<Post>("/posts", { method: "POST", body: { content, images } }),
  deletePost: (id: string) => api<null>(`/posts/${id}`, { method: "DELETE" }),

  like: (id: string) => api<LikeState>(`/posts/${id}/like`, { method: "PUT" }),
  unlike: (id: string) => api<LikeState>(`/posts/${id}/like`, { method: "DELETE" }),

  save: (id: string) => api<SaveState>(`/posts/${id}/save`, { method: "PUT" }),
  unsave: (id: string) => api<SaveState>(`/posts/${id}/save`, { method: "DELETE" }),
  getSaved: (cursor?: string) => api<PostPage>(`/saved/posts?${page(cursor)}`),
  // Um post só (usado pelo link compartilhado)
  getPost: (id: string) => api<Post>(`/posts/${id}`),

  getComments: (postId: string, cursor?: string) => api<CommentPage>(`/posts/${postId}/comments?${page(cursor)}`),
  createComment: (postId: string, content: string) =>
    api<Comment>(`/posts/${postId}/comments`, { method: "POST", body: { content } }),
  deleteComment: (id: string) => api<null>(`/comments/${id}`, { method: "DELETE" }),

  searchProfiles: (search: string) => api<Author[]>(`/profiles?${new URLSearchParams({ search })}`),
  getProfile: (username: string) => api<Profile>(`/profiles/${encodeURIComponent(username)}`),
  getProfilePosts: (username: string, cursor?: string) =>
    api<PostPage>(`/profiles/${encodeURIComponent(username)}/posts?${page(cursor)}`),
  getFollowers: (username: string, cursor?: string) =>
    api<FollowPage>(`/profiles/${encodeURIComponent(username)}/followers?${page(cursor)}`),
  getFollowing: (username: string, cursor?: string) =>
    api<FollowPage>(`/profiles/${encodeURIComponent(username)}/following?${page(cursor)}`),
  follow: (username: string) => api<FollowState>(`/profiles/${encodeURIComponent(username)}/follow`, { method: "PUT" }),
  unfollow: (username: string) =>
    api<FollowState>(`/profiles/${encodeURIComponent(username)}/follow`, { method: "DELETE" }),
};
