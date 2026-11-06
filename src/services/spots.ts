import type {
  Meetup,
  MeetupDetail,
  MeetupInput,
  MySpot,
  ReviewSpot,
  Spot,
  SpotInput,
  SpotPin,
  SpotStatus,
} from "@/types/spot";
import { api } from "./api";

// Spots no mapa e encontros. Tudo exige login e 13 anos ou mais.
export const spotService = {
  list: () => api<SpotPin[]>("/spots"),
  mine: () => api<MySpot[]>("/spots/mine"),
  get: (id: string) => api<Spot>(`/spots/${id}`),
  create: (input: SpotInput) => api<{ id: string; status: SpotStatus }>("/spots", { method: "POST", body: input }),
  remove: (id: string) => api<void>(`/spots/${id}`, { method: "DELETE" }),

  createMeetup: (spotId: string, input: MeetupInput) =>
    api<Meetup>(`/spots/${spotId}/meetups`, { method: "POST", body: input }),
  upcomingMeetups: () => api<Meetup[]>("/meetups"),
  myMeetups: () => api<Meetup[]>("/meetups/mine"),
  getMeetup: (id: string) => api<MeetupDetail>(`/meetups/${id}`),
  join: (id: string) => api<MeetupDetail>(`/meetups/${id}/join`, { method: "POST" }),
  leave: (id: string) => api<MeetupDetail>(`/meetups/${id}/join`, { method: "DELETE" }),
  cancel: (id: string) => api<MeetupDetail>(`/meetups/${id}/cancel`, { method: "POST" }),

  // Painel do administrador
  forReview: (status: SpotStatus) => api<ReviewSpot[]>(`/admin/spots?status=${status}`),
  review: (id: string, status: "APROVADO" | "RECUSADO") =>
    api<{ id: string; status: SpotStatus }>(`/admin/spots/${id}`, { method: "PATCH", body: { status } }),
};
