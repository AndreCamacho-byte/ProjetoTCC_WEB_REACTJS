import { Link } from "react-router-dom";
import type { Meetup, SpotStatus } from "@/types/spot";
import { SPOT_STATUS_LABEL, meetupDate } from "@/utils/format";
import styles from "./Spots.module.css";

// Spots e encontros exigem login: visitante vê um convite
export function Invite({ area, from }: { area: string; from: string }) {
  return (
    <section className={styles.page} style={{ maxWidth: 560, textAlign: "center", paddingTop: 64 }}>
      <p className={styles.kicker}>{area}</p>
      <h1 className={styles.title}>Ache spots e marque o rolê</h1>
      <p className={styles.muted} style={{ lineHeight: 1.5 }}>
        Veja no mapa onde a galera anda, sugira picos novos e confirme presença nos encontros. Entre ou crie uma
        conta para ver.
      </p>
      <div className={styles.actions} style={{ justifyContent: "center", marginTop: 24 }}>
        <Link to="/login" state={{ from }} className={styles.primary}>
          Entrar
        </Link>
        <Link to="/register" className={styles.secondary}>
          Criar conta
        </Link>
      </div>
    </section>
  );
}

export function StatusBadge({ status }: { status: SpotStatus }) {
  const className =
    status === "APROVADO" ? styles.badgeGood : status === "RECUSADO" ? styles.badgeBad : styles.badgeWarn;
  return <span className={className}>{SPOT_STATUS_LABEL[status]}</span>;
}

// "5 confirmados" ou "5 de 10 confirmados"
export function participantsText(meetup: Pick<Meetup, "participantCount" | "maxParticipants">) {
  const total = meetup.maxParticipants ? ` de ${meetup.maxParticipants}` : "";
  return `${meetup.participantCount}${total} ${meetup.participantCount === 1 && !total ? "confirmado" : "confirmados"}`;
}

// Situação do encontro em uma palavra, quando não está "normal"
export function MeetupBadge({ meetup }: { meetup: Meetup }) {
  if (meetup.cancelled) return <span className={styles.badgeBad}>Cancelado</span>;
  if (meetup.started) return <span className={styles.badge}>Já aconteceu</span>;
  if (meetup.full) return <span className={styles.badgeWarn}>Lotado</span>;
  if (meetup.joinedByMe) return <span className={styles.badgeGood}>Você vai</span>;
  return null;
}

// Linha de um encontro nas listas (página do spot e Eventos)
export function MeetupRow({ meetup, showSpot = false }: { meetup: Meetup; showSpot?: boolean }) {
  return (
    <li className={`${styles.card} ${styles.meetup} ${meetup.cancelled ? styles.meetupCancelled : ""}`}>
      <Link to={`/eventos/${meetup.id}`} className={styles.meetupLink}>
        <span className={styles.meetupWhen}>{meetupDate(meetup.startsAt)}</span>
        <br />
        <strong>{meetup.title}</strong>
        <br />
        <span className={styles.meta}>
          {showSpot ? `${meetup.spot.name} · ` : ""}
          {participantsText(meetup)} · criado por @{meetup.creator.username}
        </span>
      </Link>
      <MeetupBadge meetup={meetup} />
    </li>
  );
}
