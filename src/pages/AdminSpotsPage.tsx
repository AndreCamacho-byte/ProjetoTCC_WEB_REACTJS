import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminTabs } from "@/components/AdminTabs";
import { usePageTitle } from "@/hooks/usePageTitle";
import { spotService } from "@/services/spots";
import type { ReviewSpot, SpotStatus } from "@/types/spot";
import { SPOT_STATUS_LABEL, SPOT_TYPE_LABEL, formatDate } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import { StatusBadge } from "./spots/shared";
import styles from "./AdminUsersPage.module.css";
import spotStyles from "./spots/Spots.module.css";

const STATUSES: SpotStatus[] = ["PENDENTE", "APROVADO", "RECUSADO"];

// Painel do administrador: aprovar ou recusar os spots sugeridos
export function AdminSpotsPage() {
  usePageTitle("Spots · Painel admin");

  const [status, setStatus] = useState<SpotStatus>("PENDENTE");
  const [spots, setSpots] = useState<ReviewSpot[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setSpots(await spotService.forReview(status));
    } catch (err) {
      setError(apiMessage(err));
    }
  }, [status]);

  useEffect(() => {
    setSpots(null);
    load();
  }, [load]);

  async function run(spot: ReviewSpot, action: () => Promise<unknown>) {
    setBusyId(spot.id);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusyId("");
    }
  }

  function remove(spot: ReviewSpot) {
    if (!window.confirm(`Apagar o spot "${spot.name}"? Os encontros marcados nele também somem.`)) return;
    void run(spot, () => spotService.remove(spot.id));
  }

  return (
    <div className={styles.page}>
      <AdminTabs />
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Administração</p>
          <h1 className={styles.title}>Spots</h1>
        </div>
      </header>

      <div className={spotStyles.tabs} role="tablist" aria-label="Situação dos spots">
        {STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            className={status === value ? spotStyles.tabActive : spotStyles.tab}
            onClick={() => setStatus(value)}
          >
            {value === "PENDENTE" ? "Para aprovar" : SPOT_STATUS_LABEL[value]}
          </button>
        ))}
      </div>

      {error && (
        <p className={spotStyles.error} role="alert" style={{ marginBottom: 16 }}>
          {error}
        </p>
      )}
      {spots === null && !error && <p className={spotStyles.muted}>Carregando...</p>}
      {spots?.length === 0 && (
        <p className={spotStyles.empty}>
          {status === "PENDENTE" ? "Nenhuma sugestão esperando aprovação." : "Nenhum spot aqui."}
        </p>
      )}

      {spots && spots.length > 0 && (
        <ul className={spotStyles.reviewList}>
          {spots.map((spot) => {
            const mapLink = `https://www.openstreetmap.org/?mlat=${spot.latitude}&mlon=${spot.longitude}#map=18/${spot.latitude}/${spot.longitude}`;
            return (
              <li key={spot.id} className={spotStyles.card}>
                <div className={spotStyles.header} style={{ marginBottom: 8 }}>
                  <div>
                    <strong>{spot.name}</strong>{" "}
                    <span className={spotStyles.meta}>
                      · {SPOT_TYPE_LABEL[spot.type]}
                      {spot.address ? ` · ${spot.address}` : ""}
                    </span>
                    <br />
                    <span className={spotStyles.meta}>
                      Sugerido {spot.createdBy ? `por ${spot.createdBy.name} (@${spot.createdBy.username})` : "por conta apagada"}{" "}
                      em {formatDate(spot.createdAt)}
                    </span>
                  </div>
                  <StatusBadge status={spot.status} />
                </div>

                {spot.description && <p className={spotStyles.description}>{spot.description}</p>}
                {spot.imageUrls.length > 0 && (
                  <div className={spotStyles.reviewThumbs}>
                    {spot.imageUrls.map((url, index) => (
                      <img key={url} src={url} alt={`Foto ${index + 1} de ${spot.name}`} />
                    ))}
                  </div>
                )}

                <div className={spotStyles.actions}>
                  {spot.status !== "APROVADO" && (
                    <button
                      type="button"
                      className={spotStyles.primary}
                      disabled={busyId === spot.id}
                      onClick={() => run(spot, () => spotService.review(spot.id, "APROVADO"))}
                    >
                      Aprovar
                    </button>
                  )}
                  {spot.status === "PENDENTE" && (
                    <button
                      type="button"
                      className={spotStyles.secondary}
                      disabled={busyId === spot.id}
                      onClick={() => run(spot, () => spotService.review(spot.id, "RECUSADO"))}
                    >
                      Recusar
                    </button>
                  )}
                  <a href={mapLink} target="_blank" rel="noreferrer" className={spotStyles.secondary}>
                    Ver no mapa
                  </a>
                  <Link to={`/explorar/spot/${spot.id}`} className={spotStyles.secondary}>
                    Abrir página
                  </Link>
                  <button type="button" className={spotStyles.danger} disabled={busyId === spot.id} onClick={() => remove(spot)}>
                    Apagar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
