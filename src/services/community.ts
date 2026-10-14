import type { Author, Comment, CommentPage, FollowState, LikeState, Post, PostPage, Profile } from "@/types/community";
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
  // `image`: foto já reduzida, em JPEG (data URL em base64)
  createPost: (content: string, image?: string) => api<Post>("/posts", { method: "POST", body: { content, image } }),
  deletePost: (id: string) => api<null>(`/posts/${id}`, { method: "DELETE" }),

  like: (id: string) => api<LikeState>(`/posts/${id}/like`, { method: "PUT" }),
  unlike: (id: string) => api<LikeState>(`/posts/${id}/like`, { method: "DELETE" }),

  getComments: (postId: string, cursor?: string) => api<CommentPage>(`/posts/${postId}/comments?${page(cursor)}`),
  createComment: (postId: string, content: string) =>
    api<Comment>(`/posts/${postId}/comments`, { method: "POST", body: { content } }),
  deleteComment: (id: string) => api<null>(`/comments/${id}`, { method: "DELETE" }),

  searchProfiles: (search: string) => api<Author[]>(`/profiles?${new URLSearchParams({ search })}`),
  getProfile: (username: string) => api<Profile>(`/profiles/${encodeURIComponent(username)}`),
  getProfilePosts: (username: string, cursor?: string) =>
    api<PostPage>(`/profiles/${encodeURIComponent(username)}/posts?${page(cursor)}`),
  follow: (username: string) => api<FollowState>(`/profiles/${encodeURIComponent(username)}/follow`, { method: "PUT" }),
  unfollow: (username: string) =>
    api<FollowState>(`/profiles/${encodeURIComponent(username)}/follow`, { method: "DELETE" }),
};
