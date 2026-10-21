import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { spotService } from "@/services/spots";
import type { Meetup } from "@/types/spot";
import { apiMessage } from "@/utils/validation";
import { Invite, MeetupRow } from "./shared";
import styles from "./Spots.module.css";

type Tab = "upcoming" | "mine";

const TABS: { value: Tab; label: string }[] = [
  { value: "upcoming", label: "Próximos" },
  { value: "mine", label: "Meus encontros" },
];

// Eventos: os próximos encontros em todos os spots e os que a pessoa confirmou
export function EventsPage() {
  usePageTitle("Eventos");
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Invite area="Eventos" from="/eventos" />;
  return <Events />;
}

function Events() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [meetups, setMeetups] = useState<Meetup[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setMeetups(null);
    setError("");
    (tab === "upcoming" ? spotService.upcomingMeetups() : spotService.myMeetups())
      .then((list) => active && setMeetups(list))
      .catch((err) => active && setError(apiMessage(err)));
    return () => {
      active = false;
    };
  }, [tab]);

  return (
    <div className={styles.page}>
      <div className={styles.narrow}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Eventos</p>
            <h1 className={styles.title}>Bora andar junto</h1>
          </div>
          <Link to="/explorar" className={styles.secondary}>
            Escolher um spot no mapa
          </Link>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Quais encontros mostrar">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              className={tab === item.value ? styles.tabActive : styles.tab}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {meetups === null && !error && <p className={styles.muted}>Carregando...</p>}
        {meetups?.length === 0 && (
          <p className={styles.empty}>
            {tab === "upcoming"
              ? "Nenhum encontro marcado. Escolha um spot no mapa e marque o primeiro!"
              : "Você ainda não confirmou presença em nenhum encontro."}
          </p>
        )}
        {meetups && meetups.length > 0 && (
          <ul className={styles.meetups}>
            {meetups.map((meetup) => (
              <MeetupRow key={meetup.id} meetup={meetup} showSpot />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
