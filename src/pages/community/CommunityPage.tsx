import { useCallback, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { useLoginGate } from "@/hooks/useLoginGate";
import { usePageTitle } from "@/hooks/usePageTitle";
import { communityService, type Feed } from "@/services/community";
import type { Author, Post } from "@/types/community";
import { SKATE_LEVEL_LABEL } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Community.module.css";
import { Composer } from "./Composer";
import { PostList } from "./PostList";

const TABS: { value: Feed; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "following", label: "Seguindo" },
];

// Feed da comunidade. Visitantes leem tudo; para postar, curtir ou seguir, vão para o login.
export function CommunityPage() {
  usePageTitle("Comunidade");

  const { user, loading } = useAuth();
  const needsLogin = useLoginGate();
  const [feed, setFeed] = useState<Feed>("all");
  const [newPost, setNewPost] = useState<Post | null>(null);

  // Ao entrar ou sair da conta, recarrega para mostrar as curtidas e os salvos certos
  const userId = user?.id;
  const load = useCallback((cursor?: string) => communityService.getFeed(feed, cursor), [feed, userId]);

  if (loading) return null;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <header className={styles.pageHeader}>
          <p className={styles.kicker}>Comunidade</p>
          <h1 className={styles.title}>O que a galera está andando</h1>
        </header>

        <div className={styles.main}>
          {user ? <Composer user={user} onPosted={setNewPost} /> : <Invite />}

          <div className={styles.tabs} role="tablist" aria-label="Qual feed mostrar">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={feed === tab.value}
                className={feed === tab.value ? styles.tabActive : styles.tab}
                onClick={() => {
                  if (tab.value === "following" && needsLogin()) return;
                  setFeed(tab.value);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <PostList
            load={load}
            newPost={newPost}
            emptyText={
              feed === "following"
                ? "Os posts de quem você segue aparecem aqui. Procure pessoas ao lado para começar a seguir."
                : "Ninguém postou ainda. Que tal ser o primeiro?"
            }
          />
        </div>

        <aside className={styles.aside}>
          <PeopleSearch />
        </aside>
      </div>
    </div>
  );
}

function PeopleSearch() {
  const needsLogin = useLoginGate();
  const [text, setText] = useState("");
  const [people, setPeople] = useState<Author[] | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || needsLogin()) return;
    setError("");
    try {
      setPeople(await communityService.searchProfiles(text.trim()));
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  return (
    <section className={styles.card}>
      <h2>Encontrar skatistas</h2>
      <form className={styles.searchForm} role="search" onSubmit={handleSubmit}>
        <input
          type="search"
          aria-label="Buscar pessoas"
          placeholder="Nome ou @"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className={styles.secondary}>
          Buscar
        </button>
      </form>

      {error && (
        <p className={styles.error} role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      {people && people.length === 0 && (
        <p className={styles.muted} style={{ margin: "12px 0 0" }}>
          Ninguém encontrado.
        </p>
      )}
      {people && people.length > 0 && (
        <ul className={styles.people}>
          {people.map((person) => (
            <li key={person.id}>
              <Link to={`/u/${person.username}`} className={styles.person}>
                <Avatar user={person} size={36} />
                <span>
                  <strong>{person.name}</strong>
                  <span className={styles.meta}>
                    @{person.username}
                    {person.skateLevel ? ` · ${SKATE_LEVEL_LABEL[person.skateLevel]}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Invite() {
  return (
    <section className={styles.card}>
      <h2>Faça parte da comunidade</h2>
      <p className={styles.muted}>Crie uma conta para postar, curtir, comentar e seguir outros skatistas.</p>
      <div className={styles.inviteActions}>
        <Link to="/login" state={{ from: "/comunidade" }} className={styles.primary}>
          Entrar
        </Link>
        <Link to="/register" className={styles.secondary}>
          Criar conta
        </Link>
      </div>
    </section>
  );
}
