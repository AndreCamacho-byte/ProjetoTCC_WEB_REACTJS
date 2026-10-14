import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { ChevronLeftIcon, CloseIcon } from "@/components/icons";
import { Lightbox } from "@/components/Lightbox";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/services/api";
import { chatService } from "@/services/chat";
import { communityService } from "@/services/community";
import type { FollowPerson, Profile } from "@/types/community";
import { SKATE_LEVEL_LABEL } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Community.module.css";
import { PostList } from "./PostList";

type ListKind = "followers" | "following";

// Texto do botão de seguir, como nas redes sociais
function followLabel(followedByMe: boolean, followsMe: boolean) {
  if (followedByMe) return "Seguindo";
  return followsMe ? "Seguir de volta" : "Seguir";
}

// Perfil público de um skatista: foto, bio, nível, seguidores, seguindo e posts
export function ProfilePage() {
  const { username = "" } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [list, setList] = useState<ListKind | null>(null);

  usePageTitle(profile ? `${profile.name} (@${profile.username})` : "Perfil");

  const loadProfile = useCallback(() => {
    let ignore = false;
    communityService.getProfile(username).then(
      (result) => !ignore && setProfile(result),
      (err) => {
        if (ignore) return;
        setError(err instanceof ApiError && err.status === 404 ? "Este perfil não existe ou não está disponível." : apiMessage(err));
      },
    );
    return () => {
      ignore = true;
    };
  }, [username]);

  useEffect(() => {
    setProfile(null);
    setError("");
    setList(null);
    return loadProfile();
  }, [loadProfile, pathname]);

  const load = useCallback((cursor?: string) => communityService.getProfilePosts(username, cursor), [username]);

  async function toggleFollow() {
    if (!profile) return;
    setBusy(true);
    try {
      const state = profile.followedByMe
        ? await communityService.unfollow(profile.username)
        : await communityService.follow(profile.username);
      setProfile({ ...profile, ...state });
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const friends = profile?.followedByMe && profile.followsMe;

  async function openChat() {
    if (!profile) return;
    try {
      const conversation = await chatService.open(profile.username);
      navigate(`/mensagens/${conversation.id}`);
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${styles.single}`}>
        <div className={styles.main}>
          <Link to="/comunidade" className={styles.back}>
            <ChevronLeftIcon size={16} /> Comunidade
          </Link>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {!profile && !error && <p className={styles.empty}>Carregando...</p>}

          {profile && (
            <>
              <section className={`${styles.card} ${styles.profile}`}>
                {profile.avatarUrl ? (
                  <button
                    type="button"
                    className={styles.avatarButton}
                    aria-label={`Ver a foto de ${profile.name} ampliada`}
                    onClick={() => setPhotoOpen(true)}
                  >
                    <Avatar user={profile} size={88} />
                  </button>
                ) : (
                  <Avatar user={profile} size={88} />
                )}
                <div>
                  <h1 className={styles.profileName}>
                    {profile.name}
                    {profile.skateLevel && <span className={styles.level}>{SKATE_LEVEL_LABEL[profile.skateLevel]}</span>}
                  </h1>
                  <span className={styles.meta}>
                    @{profile.username}
                    {!profile.isMe && profile.followsMe && (
                      <span className={styles.followsMe}>{friends ? "Vocês são amigos" : "Segue você"}</span>
                    )}
                  </span>
                </div>

                {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

                <ul className={styles.stats}>
                  <li>
                    <strong>{profile.posts}</strong> {profile.posts === 1 ? "post" : "posts"}
                  </li>
                  <li>
                    <button type="button" className={styles.statButton} onClick={() => setList("followers")}>
                      <strong>{profile.followers}</strong> {profile.followers === 1 ? "seguidor" : "seguidores"}
                    </button>
                  </li>
                  <li>
                    <button type="button" className={styles.statButton} onClick={() => setList("following")}>
                      <strong>{profile.following}</strong> seguindo
                    </button>
                  </li>
                </ul>

                <div className={styles.profileActions}>
                  {profile.isMe ? (
                    <>
                      <Link to="/conta" className={styles.secondary}>
                        Editar perfil
                      </Link>
                      <Link to="/salvos" className={styles.secondary}>
                        Salvos
                      </Link>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={profile.followedByMe ? styles.secondary : styles.primary}
                      aria-pressed={profile.followedByMe}
                      disabled={busy}
                      onClick={toggleFollow}
                    >
                      {followLabel(profile.followedByMe, profile.followsMe)}
                    </button>
                  )}
                  {/* Só amigos (os dois se seguem) conversam */}
                  {!profile.isMe && friends && (
                    <button type="button" className={styles.secondary} onClick={openChat}>
                      Mensagem
                    </button>
                  )}
                </div>
              </section>

              <PostList
                load={load}
                emptyText={profile.isMe ? "Você ainda não postou nada. Conte como foi sua última sessão!" : "Nenhum post ainda."}
              />

              {photoOpen && profile.avatarUrl && (
                <Lightbox images={[profile.avatarUrl]} alt={`Foto de ${profile.name}`} round onClose={() => setPhotoOpen(false)} />
              )}

              {list && (
                <FollowList
                  username={profile.username}
                  kind={list}
                  onClose={() => setList(null)}
                  // Seguir alguém pela lista do próprio perfil muda o número "seguindo"
                  onFollowChange={(delta) =>
                    profile.isMe && setProfile((current) => current && { ...current, following: current.following + delta })
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type FollowListProps = { username: string; kind: ListKind; onClose: () => void; onFollowChange: (delta: number) => void };

// Janela com a lista de seguidores ou de quem a pessoa segue
function FollowList({ username, kind, onClose, onFollowChange }: FollowListProps) {
  const [people, setPeople] = useState<FollowPerson[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const title = kind === "followers" ? "Seguidores" : "Seguindo";

  const fetchPage = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const page =
          kind === "followers"
            ? await communityService.getFollowers(username, cursor)
            : await communityService.getFollowing(username, cursor);
        setPeople((current) => (cursor ? [...current, ...page.people] : page.people));
        setNextCursor(page.nextCursor);
      } catch (err) {
        setError(apiMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [kind, username],
  );

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // Fecha com a tecla Esc
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function toggle(person: FollowPerson) {
    try {
      const state = person.followedByMe ? await communityService.unfollow(person.username) : await communityService.follow(person.username);
      setPeople((current) => current.map((p) => (p.id === person.id ? { ...p, followedByMe: state.followedByMe } : p)));
      onFollowChange(state.followedByMe ? 1 : -1);
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.dialogHeader}>
          <h2>{title}</h2>
          <button type="button" className={styles.iconButton} aria-label="Fechar" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </header>
        <div className={styles.dialogBody}>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {!loading && !error && people.length === 0 && (
            <p className={styles.empty}>{kind === "followers" ? "Ninguém segue este perfil ainda." : "Este perfil ainda não segue ninguém."}</p>
          )}
          <ul className={styles.people} style={{ margin: 0 }}>
            {people.map((person) => (
              <li key={person.id} className={styles.personRow}>
                <Link to={`/u/${person.username}`} className={styles.person} onClick={onClose}>
                  <Avatar user={person} size={40} />
                  <span>
                    <strong>{person.name}</strong>
                    <span className={styles.meta}>@{person.username}</span>
                  </span>
                </Link>
                {!person.isMe && (
                  <button
                    type="button"
                    className={`${person.followedByMe ? styles.secondary : styles.primary} ${styles.smallButton}`}
                    aria-pressed={person.followedByMe}
                    aria-label={`${person.followedByMe ? "Deixar de seguir" : "Seguir"} @${person.username}`}
                    onClick={() => toggle(person)}
                  >
                    {person.followedByMe ? "Seguindo" : "Seguir"}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {loading && <p className={styles.empty}>Carregando...</p>}
          {nextCursor && !loading && (
            <button type="button" className={`${styles.secondary} ${styles.loadMore}`} style={{ display: "flex", margin: "8px auto" }} onClick={() => fetchPage(nextCursor)}>
              Carregar mais
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
