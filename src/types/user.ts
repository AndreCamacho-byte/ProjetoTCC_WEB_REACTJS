export type SkateLevel = "INICIANTE" | "INTERMEDIARIO" | "AVANCADO" | "PROFISSIONAL";

export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  skateLevel: SkateLevel | null;
  role: "USER" | "ADMIN";
  // Data em que o email foi confirmado (null = ainda não confirmou)
  emailVerifiedAt: string | null;
  // Data de nascimento (ex.: "2005-05-12T00:00:00.000Z"). null = conta antiga, idade não verificada
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};
