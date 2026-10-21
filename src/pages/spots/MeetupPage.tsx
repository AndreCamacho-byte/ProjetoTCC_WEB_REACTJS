import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { spotService } from "@/services/spots";
import type { MeetupDetail } from "@/types/spot";
import { SPOT_TYPE_LABEL, meetupDate } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import { Invite, MeetupBadge, participantsText } from "./shared";
import styles from "./Spots.module.css";

// Página de um encontro: quando, onde, quem vai e os botões de confirmar, desistir e cancelar
export function MeetupPage() {
  const { id = "" } = useParams();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Invite area="Eventos" from={`/eventos/${id}`} />;
  return <MeetupDetails id={id} />;
}

function MeetupDetails({ id }: { id: string }) {
  const [meetup, setMeetup] = useState<MeetupDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  usePageTitle(meetup?.title ?? "Encontro");

  useEffect(() => {
    let active = true;
    setMeetup(null);
    setError("");
    spotService
      .getMeetup(id)
      .then((data) => active && setMeetup(data))
      .catch((err) => active && setError(apiMessage(err)));
    return () => {
      active = false;
    };
  }, [id]);

  async function act(action: () => Promise<MeetupDetail>) {
    setError("");
    setBusy(true);
    try {
      setMeetup(await action());
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    if (!window.confirm("Cancelar este encontro? Quem confirmou presença vai ver que foi cancelado.")) return;
    void act(() => spotService.cancel(id));
  }

  if (error && !meetup) {
    return (
      <div className={styles.page}>
        <p className={styles.error} role="alert">
          {error}
        </p>
        <p>
          <Link to="/eventos">Voltar aos eventos</Link>
        </p>
      </div>
    );
  }
  if (!meetup) return <div className={styles.page}>Carregando...</div>;

  const open = !meetup.cancelled && !meetup.started;

  return (
    <div className={styles.page}>
      <div className={styles.narrow}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>
              <Link to="/eventos" style={{ color: "inherit" }}>
                Eventos
              </Link>
            </p>
            <h1 className={styles.title}>{meetup.title}</h1>
            <p className={styles.meetupWhen} style={{ margin: "6px 0 0" }}>
              {meetupDate(meetup.startsAt)}
            </p>
          </div>
          <MeetupBadge meetup={meetup} />
        </header>

        {meetup.cancelled && (
          <p className={styles.notice} style={{ marginBottom: 16 }}>
            Este encontro foi cancelado.
          </p>
        )}

        <section className={styles.card} style={{ marginBottom: 16 }}>
          <p style={{ margin: "0 0 8px" }}>
            <strong>Onde: </strong>
            <Link to={`/explorar/spot/${meetup.spot.id}`}>{meetup.spot.name}</Link>{" "}
            <span className={styles.meta}>
              ({SPOT_TYPE_LABEL[meetup.spot.type]}
              {meetup.spot.address ? ` · ${meetup.spot.address}` : ""})
            </span>
          </p>
          <p style={{ margin: "0 0 8px" }}>
            <strong>Quem marcou: </strong>
            <Link to={`/u/${meetup.creator.username}`}>@{meetup.creator.username}</Link>
          </p>
          <p style={{ margin: 0 }}>
            <strong>Presença: </strong>
            {participantsText(meetup)}
            {meetup.maxParticipants === null ? " · sem limite" : ""}
          </p>
          {meetup.description && (
            <p className={styles.description} style={{ margin: "12px 0 0" }}>
              {meetup.description}
            </p>
          )}
        </section>

        {error && (
          <p className={styles.error} role="alert" style={{ marginBottom: 16 }}>
            {error}
          </p>
        )}

        {open && (
          <div className={styles.actions} style={{ marginBottom: 24 }}>
            {!meetup.joinedByMe && (
              <button
                type="button"
                className={styles.primary}
                disabled={busy || meetup.full}
                onClick={() => act(() => spotService.join(id))}
              >
                {meetup.full ? "Lotado" : "Vou nessa"}
              </button>
            )}
            {meetup.joinedByMe && !meetup.isCreator && (
              <button type="button" className={styles.secondary} disabled={busy} onClick={() => act(() => spotService.leave(id))}>
                Não vou mais
              </button>
            )}
            {meetup.canCancel && (
              <button type="button" className={styles.danger} disabled={busy} onClick={handleCancel}>
                Cancelar encontro
              </button>
            )}
          </div>
        )}

        <section aria-labelledby="quem-vai">
          <h2 id="quem-vai" className={styles.subtitle}>
            Quem vai
          </h2>
          <ul className={styles.people}>
            {meetup.participants.map((person) => (
              <li key={person.id}>
                <Link to={`/u/${person.username}`} className={styles.person}>
                  <Avatar user={person} size={36} />
                  <span>
                    <strong>{person.name}</strong>
                    <br />
                    <span className={styles.meta}>@{person.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
