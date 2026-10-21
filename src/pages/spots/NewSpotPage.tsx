import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { spotService } from "@/services/spots";
import type { SpotType } from "@/types/spot";
import { SPOT_TYPE_LABEL } from "@/utils/format";
import { fileToPostPhoto } from "@/utils/image";
import { apiMessage } from "@/utils/validation";
import { SpotMap, locateMe, type LatLng } from "./SpotMap";
import { Invite } from "./shared";
import styles from "./Spots.module.css";

const MAX_PHOTOS = 3;
const TYPES = Object.keys(SPOT_TYPE_LABEL) as SpotType[];

// Sugerir um spot: dados, fotos e o lugar marcado no mapa. Vai para a fila de aprovação.
export function NewSpotPage() {
  usePageTitle("Sugerir spot");
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Invite area="Explorar" from="/explorar/novo" />;
  return <NewSpotForm />;
}

function NewSpotForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<SpotType>("STREET");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError("");
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) setError(`Você pode mandar até ${MAX_PHOTOS} fotos.`);
    try {
      const added = await Promise.all(files.slice(0, room).map(fileToPostPhoto));
      setPhotos((current) => [...current, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível usar essa foto.");
    }
  }

  async function handleLocate() {
    setError("");
    try {
      const here = await locateMe();
      setPosition(here);
      setFocus(here);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não conseguimos pegar sua localização.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!position) {
      setError("Clique no mapa para marcar onde fica o spot.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const spot = await spotService.create({
        name: name.trim(),
        type,
        address: address.trim(),
        description: description.trim(),
        latitude: position.lat,
        longitude: position.lng,
        images: photos,
      });
      // Administrador cadastra já aprovado: vai direto para o spot
      if (spot.status === "APROVADO") navigate(`/explorar/spot/${spot.id}`);
      else setSent(true);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.page}>
        <section className={`${styles.narrow} ${styles.card}`} style={{ textAlign: "center", padding: 40 }}>
          <p className={styles.kicker}>Sugestão enviada</p>
          <h1 className={styles.title}>Valeu pela dica!</h1>
          <p className={styles.muted} style={{ lineHeight: 1.5 }}>
            A equipe vai conferir o spot. Assim que for aprovado, ele aparece no mapa para todo mundo. Você acompanha
            a situação em Explorar.
          </p>
          <Link to="/explorar" className={styles.primary} style={{ marginTop: 16 }}>
            Voltar ao mapa
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.narrow}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Explorar</p>
            <h1 className={styles.title}>Sugerir spot</h1>
          </div>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            Nome do spot
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              Tipo
              <select value={type} onChange={(e) => setType(e.target.value as SpotType)}>
                {TYPES.map((value) => (
                  <option key={value} value={value}>
                    {SPOT_TYPE_LABEL[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Bairro e cidade <span className={styles.hint}>(opcional)</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={120}
                placeholder="Ex.: Consolação, São Paulo"
              />
            </label>
          </div>

          <label className={styles.field}>
            Descrição <span className={styles.hint}>(opcional: obstáculos, chão, melhor horário)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </label>

          <div className={styles.field}>
            <span>
              Onde fica <span className={styles.hint}>(clique no mapa para marcar)</span>
            </span>
            <SpotMap label="Marque o spot no mapa" picked={position} onPick={setPosition} focus={focus} />
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={handleLocate}>
                Usar minha localização
              </button>
              {position && <span className={`${styles.muted} ${styles.small}`}>Lugar marcado.</span>}
            </div>
          </div>

          <div className={styles.field}>
            <span>
              Fotos <span className={styles.hint}>(até {MAX_PHOTOS})</span>
            </span>
            {photos.length > 0 && (
              <div className={styles.previews}>
                {photos.map((photo, index) => (
                  <div key={index} className={styles.preview}>
                    <img src={photo} alt={`Foto ${index + 1}`} />
                    <button
                      type="button"
                      className={styles.removePhoto}
                      aria-label={`Remover foto ${index + 1}`}
                      onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < MAX_PHOTOS && (
              <input type="file" accept="image/*" multiple aria-label="Escolher fotos" onChange={handlePhotos} />
            )}
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={sending}>
              {sending ? "Enviando..." : "Enviar sugestão"}
            </button>
            <Link to="/explorar" className={styles.secondary}>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
