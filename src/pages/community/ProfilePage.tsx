import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { ChevronLeftIcon } from "@/components/icons";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/services/api";
import { communityService } from "@/services/community";
import type { Profile } from "@/types/community";
import { SKATE_LEVEL_LABEL } from "@/utils/format";
import { apiMessage } from "@/utils/validation";
import styles from "./Community.module.css";
import { PostList } from "./PostList";

// Perfil público de um skatista: foto, bio, nível, contadores e posts
export function ProfilePage() {
  const { username = "" } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  usePageTitle(profile ? `${profile.name} (@${profile.username})` : "Perfil");

  useEffect(() => {
    let ignore = false;
    setProfile(null);
    setError("");
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
                <Avatar user={profile} size={88} />
                <div>
                  <h1 className={styles.profileName}>
                    {profile.name}
                    {profile.skateLevel && <span className={styles.level}>{SKATE_LEVEL_LABEL[profile.skateLevel]}</span>}
                  </h1>
                  <span className={styles.meta}>@{profile.username}</span>
                </div>

                {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

                <ul className={styles.stats}>
                  <li>
                    <strong>{profile.posts}</strong> {profile.posts === 1 ? "post" : "posts"}
                  </li>
                  <li>
                    <strong>{profile.followers}</strong> {profile.followers === 1 ? "seguidor" : "seguidores"}
                  </li>
                  <li>
                    <strong>{profile.following}</strong> seguindo
                  </li>
                </ul>

                <div className={styles.profileActions}>
                  {profile.isMe ? (
                    <Link to="/conta" className={styles.secondary}>
                      Editar perfil
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={profile.followedByMe ? styles.secondary : styles.primary}
                      aria-pressed={profile.followedByMe}
                      disabled={busy}
                      onClick={toggleFollow}
                    >
                      {profile.followedByMe ? "Seguindo" : "Seguir"}
                    </button>
                  )}
                </div>
              </section>

              <PostList
                load={load}
                emptyText={profile.isMe ? "Você ainda não postou nada. Conte como foi sua última sessão!" : "Nenhum post ainda."}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
