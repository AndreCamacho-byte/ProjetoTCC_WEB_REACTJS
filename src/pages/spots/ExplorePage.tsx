import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { spotService } from "@/services/spots";
import type { MySpot, SpotPin } from "@/types/spot";
import { SPOT_TYPE_LABEL } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import { SpotMap, locateMe, type LatLng } from "./SpotMap";
import { Invite, StatusBadge } from "./shared";
import styles from "./Spots.module.css";

// Explorar: mapa com os spots aprovados, a lista ao lado e as sugestões de quem está vendo
export function ExplorePage() {
  usePageTitle("Explorar");
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Invite area="Explorar" from="/explorar" />;
  return <Explore />;
}

function Explore() {
  const navigate = useNavigate();
  const [spots, setSpots] = useState<SpotPin[] | null>(null);
  const [mine, setMine] = useState<MySpot[]>([]);
  const [error, setError] = useState("");
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([spotService.list(), spotService.mine()])
      .then(([list, my]) => {
        if (!active) return;
        setSpots(list);
        setMine(my);
      })
      .catch((err) => active && setError(apiMessage(err)));
    return () => {
      active = false;
    };
  }, []);

  async function handleLocate() {
    setError("");
    setLocating(true);
    try {
      setFocus(await locateMe());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não conseguimos pegar sua localização.");
    } finally {
      setLocating(false);
    }
  }

  const pending = mine.filter((spot) => spot.status !== "APROVADO");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Explorar</p>
          <h1 className={styles.title}>Onde a galera anda</h1>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={handleLocate} disabled={locating}>
            {locating ? "Procurando..." : "Usar minha localização"}
          </button>
          <Link to="/explorar/novo" className={styles.primary}>
            Sugerir spot
          </Link>
        </div>
      </header>

      {error && (
        <p className={styles.error} role="alert" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div className={styles.explore}>
        <SpotMap
          label="Mapa de spots"
          pins={spots ?? []}
          focus={focus}
          onPinClick={(id) => navigate(`/explorar/spot/${id}`)}
        />

        <section aria-label="Spots no mapa">
          {spots === null && !error && <p className={styles.muted}>Carregando spots...</p>}
          {spots?.length === 0 && (
            <p className={styles.empty}>Ainda não tem spot no mapa. Sugira o primeiro!</p>
          )}
          {spots && spots.length > 0 && (
            <ul className={styles.spotList}>
              {spots.map((spot) => (
                <li key={spot.id}>
                  <Link to={`/explorar/spot/${spot.id}`} className={styles.spotItem}>
                    {spot.coverUrl ? (
                      <img className={styles.thumb} src={spot.coverUrl} alt="" />
                    ) : (
                      <span className={styles.thumb} aria-hidden="true" />
                    )}
                    <span className={styles.itemText}>
                      <strong>{spot.name}</strong>
                      <span className={styles.meta}>
                        {SPOT_TYPE_LABEL[spot.type]}
                        {spot.address ? ` · ${spot.address}` : ""}
                      </span>
                      {spot.upcomingMeetups > 0 && (
                        <span className={styles.meta}>
                          {spot.upcomingMeetups} {spot.upcomingMeetups === 1 ? "encontro marcado" : "encontros marcados"}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {pending.length > 0 && (
        <section className={styles.section} aria-labelledby="minhas-sugestoes">
          <h2 id="minhas-sugestoes" className={styles.subtitle}>
            Suas sugestões
          </h2>
          <p className={styles.muted} style={{ marginTop: 0 }}>
            A equipe confere cada spot antes de ele aparecer no mapa.
          </p>
          <ul className={styles.spotList} style={{ maxHeight: "none" }}>
            {pending.map((spot) => (
              <li key={spot.id}>
                <Link to={`/explorar/spot/${spot.id}`} className={styles.spotItem}>
                  <span className={styles.itemText}>
                    <strong>{spot.name}</strong>
                    <span className={styles.meta}>{SPOT_TYPE_LABEL[spot.type]}</span>
                  </span>
                  <span style={{ marginLeft: "auto" }}>
                    <StatusBadge status={spot.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
