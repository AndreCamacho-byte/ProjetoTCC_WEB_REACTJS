import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { Lightbox } from "@/components/Lightbox";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { spotService } from "@/services/spots";
import type { Spot } from "@/types/spot";
import { SPOT_TYPE_LABEL, toDateTimeInput } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import { SpotMap } from "./SpotMap";
import { Invite, MeetupRow, StatusBadge } from "./shared";
import styles from "./Spots.module.css";

const MAX_PARTICIPANTS = 50;

// Página do spot: fotos, onde fica, próximos encontros e o formulário para marcar um
export function SpotPage() {
  const { id = "" } = useParams();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Invite area="Explorar" from={`/explorar/spot/${id}`} />;
  return <SpotDetails id={id} />;
}

function SpotDetails({ id }: { id: string }) {
  const navigate = useNavigate();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<number | null>(null);
  const [planning, setPlanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  usePageTitle(spot?.name ?? "Spot");

  useEffect(() => {
    let active = true;
    setSpot(null);
    setError("");
    spotService
      .get(id)
      .then((data) => active && setSpot(data))
      .catch((err) => active && setError(apiMessage(err)));
    return () => {
      active = false;
    };
  }, [id]);

  const pins = useMemo(() => (spot ? [spot] : []), [spot]);

  async function handleDelete() {
    if (!spot || !window.confirm(`Apagar o spot "${spot.name}"? Os encontros marcados nele também somem.`)) return;
    setDeleting(true);
    try {
      await spotService.remove(spot.id);
      navigate("/explorar");
    } catch (err) {
      setError(apiMessage(err));
      setDeleting(false);
    }
  }

  if (error && !spot) {
    return (
      <div className={styles.page}>
        <p className={styles.error} role="alert">
          {error}
        </p>
        <p>
          <Link to="/explorar">Voltar ao mapa</Link>
        </p>
      </div>
    );
  }
  if (!spot) return <div className={styles.page}>Carregando...</div>;

  const directions = `https://www.openstreetmap.org/directions?to=${spot.latitude}%2C${spot.longitude}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>
            <Link to="/explorar" style={{ color: "inherit" }}>
              Explorar
            </Link>{" "}
            · {SPOT_TYPE_LABEL[spot.type]}
          </p>
          <h1 className={styles.title}>{spot.name}</h1>
          {spot.address && <p className={styles.muted} style={{ margin: "4px 0 0" }}>{spot.address}</p>}
        </div>
        <div className={styles.actions}>
          {spot.status !== "APROVADO" && <StatusBadge status={spot.status} />}
          {spot.canDelete && (
            <button type="button" className={styles.danger} onClick={handleDelete} disabled={deleting}>
              Apagar spot
            </button>
          )}
        </div>
      </header>

      {spot.status === "PENDENTE" && (
        <p className={styles.notice} style={{ marginBottom: 16 }}>
          Este spot está esperando a aprovação da equipe. Por enquanto, só você vê esta página.
        </p>
      )}
      {spot.status === "RECUSADO" && (
        <p className={styles.notice} style={{ marginBottom: 16 }}>
          A equipe não aprovou este spot. Ele não aparece no mapa.
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}

      {spot.imageUrls.length > 0 && (
        <div className={styles.photos}>
          {spot.imageUrls.map((url, index) => (
            <button key={url} type="button" className={styles.photoButton} onClick={() => setPhoto(index)}>
              <img src={url} alt={`Foto ${index + 1} de ${spot.name}`} />
            </button>
          ))}
        </div>
      )}

      <div className={styles.details}>
        <section>
          {spot.description && <p className={styles.description}>{spot.description}</p>}
          {spot.createdBy && (
            <p className={`${styles.muted} ${styles.small}`}>
              Sugerido por{" "}
              <Link to={`/u/${spot.createdBy.username}`} className={styles.person} style={{ display: "inline-flex" }}>
                <Avatar user={spot.createdBy} size={22} /> @{spot.createdBy.username}
              </Link>
            </p>
          )}
          <SpotMap label={`Mapa de ${spot.name}`} pins={pins} className={styles.mapSmall} />
          <p className={styles.small}>
            <a href={directions} target="_blank" rel="noreferrer">
              Como chegar (abre o OpenStreetMap)
            </a>
          </p>
        </section>

        <section aria-labelledby="encontros">
          <div className={styles.header} style={{ marginBottom: 12 }}>
            <h2 id="encontros" className={styles.subtitle} style={{ margin: 0 }}>
              Próximos encontros
            </h2>
            {spot.status === "APROVADO" && !planning && (
              <button type="button" className={styles.primary} onClick={() => setPlanning(true)}>
                Marcar encontro
              </button>
            )}
          </div>

          {planning && <MeetupForm spotId={spot.id} onCancel={() => setPlanning(false)} />}

          {spot.meetups.length === 0 ? (
            !planning && <p className={styles.muted}>Nenhum encontro marcado aqui ainda.</p>
          ) : (
            <ul className={styles.meetups}>
              {spot.meetups.map((meetup) => (
                <MeetupRow key={meetup.id} meetup={meetup} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {photo !== null && (
        <Lightbox
          images={spot.imageUrls}
          index={photo}
          alt={spot.name}
          onIndexChange={setPhoto}
          onClose={() => setPhoto(null)}
        />
      )}
    </div>
  );
}

function MeetupForm({ spotId, onCancel }: { spotId: string; onCancel: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [limited, setLimited] = useState(false);
  const [limit, setLimit] = useState(10);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const now = toDateTimeInput(new Date());

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!startsAt) {
      setError("Escolha a data e a hora.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const meetup = await spotService.createMeetup(spotId, {
        title: title.trim(),
        description: description.trim(),
        // O campo traz o horário do aparelho; vira data completa com fuso antes de ir para a API
        startsAt: new Date(startsAt).toISOString(),
        maxParticipants: limited ? limit : null,
      });
      navigate(`/eventos/${meetup.id}`);
    } catch (err) {
      setError(apiMessage(err));
      setSending(false);
    }
  }

  return (
    <form className={`${styles.card} ${styles.form}`} style={{ marginBottom: 16 }} onSubmit={handleSubmit} noValidate>
      <label className={styles.field}>
        Nome do encontro
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Ex.: Sessão de sábado"
          required
        />
      </label>
      <label className={styles.field}>
        Data e hora
        <input type="datetime-local" value={startsAt} min={now} onChange={(e) => setStartsAt(e.target.value)} required />
      </label>
      <label className={styles.field} style={{ flexDirection: "row", alignItems: "center" }}>
        <input
          type="checkbox"
          checked={limited}
          onChange={(e) => setLimited(e.target.checked)}
          style={{ width: "auto" }}
        />
        Limitar o número de pessoas
      </label>
      {limited && (
        <label className={styles.field}>
          Máximo de pessoas (contando você)
          <input
            type="number"
            min={2}
            max={MAX_PARTICIPANTS}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
      )}
      <label className={styles.field}>
        Detalhes <span className={styles.hint}>(opcional)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={sending}>
          {sending ? "Criando..." : "Criar encontro"}
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
