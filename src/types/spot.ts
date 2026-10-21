import type { Author } from "./community";

export type SpotType = "STREET" | "PISTA" | "BOWL" | "MINI_RAMP" | "DIY" | "OUTRO";
// Spot sugerido só aparece no mapa depois que um administrador aprova
export type SpotStatus = "PENDENTE" | "APROVADO" | "RECUSADO";

// Spot aprovado, do jeito que vai para o mapa
export type SpotPin = {
  id: string;
  name: string;
  type: SpotType;
  address: string | null;
  latitude: number;
  longitude: number;
  coverUrl: string | null;
  upcomingMeetups: number;
};

export type Meetup = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  // Nulo = sem limite
  maxParticipants: number | null;
  participantCount: number;
  full: boolean;
  cancelled: boolean;
  started: boolean;
  spot: { id: string; name: string; address: string | null; type: SpotType };
  creator: Author;
  joinedByMe: boolean;
  isCreator: boolean;
  canCancel: boolean;
};

export type MeetupDetail = Meetup & { participants: Author[] };

export type Spot = {
  id: string;
  name: string;
  description: string | null;
  type: SpotType;
  address: string | null;
  latitude: number;
  longitude: number;
  status: SpotStatus;
  imageUrls: string[];
  // Nulo se a conta de quem sugeriu foi apagada ou suspensa
  createdBy: Author | null;
  createdAt: string;
  canDelete: boolean;
  meetups: Meetup[];
};

// Sugestão de quem está logado, com a situação
export type MySpot = {
  id: string;
  name: string;
  type: SpotType;
  address: string | null;
  status: SpotStatus;
  coverUrl: string | null;
  createdAt: string;
};

// Spot na fila de aprovação do painel
export type ReviewSpot = {
  id: string;
  name: string;
  description: string | null;
  type: SpotType;
  address: string | null;
  latitude: number;
  longitude: number;
  status: SpotStatus;
  imageUrls: string[];
  createdBy: { id: string; name: string; username: string } | null;
  createdAt: string;
};

export type SpotInput = {
  name: string;
  type: SpotType;
  address: string;
  description: string;
  latitude: number;
  longitude: number;
  images: string[];
};

export type MeetupInput = {
  title: string;
  description: string;
  startsAt: string;
  maxParticipants: number | null;
};
