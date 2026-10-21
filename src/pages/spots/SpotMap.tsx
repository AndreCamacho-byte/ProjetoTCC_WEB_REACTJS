import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./Spots.module.css";

// Mapa do OpenStreetMap, desenhado com a biblioteca Leaflet. Não precisa de chave nem de conta:
// os "azulejos" do mapa vêm dos servidores do OpenStreetMap, que pedem só o crédito no canto.
const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Sem spot nenhum, o mapa abre no centro de São Paulo
export const DEFAULT_CENTER = { lat: -23.5505, lng: -46.6333 };

export type LatLng = { lat: number; lng: number };
export type MapPin = { id: string; name: string; latitude: number; longitude: number };

type Props = {
  pins?: MapPin[];
  onPinClick?: (id: string) => void;
  // Modo "escolher lugar": clicar no mapa move o alfinete e avisa a posição
  picked?: LatLng | null;
  onPick?: (position: LatLng) => void;
  // Quando muda, o mapa vai até essa posição (ex.: depois de "usar minha localização")
  focus?: LatLng | null;
  label: string;
  className?: string;
};

// Alfinete com as cores da marca (desenhado em CSS, sem depender das imagens do Leaflet)
const pinIcon = (selected = false) =>
  L.divIcon({
    className: selected ? styles.pinPicked : styles.pin,
    html: "<span></span>",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

export function SpotMap({ pins = [], onPinClick, picked, onPick, focus, label, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinLayerRef = useRef<L.LayerGroup | null>(null);
  const pickedRef = useRef<L.Marker | null>(null);
  // Guarda as funções mais recentes sem precisar recriar o mapa
  const handlers = useRef({ onPinClick, onPick });
  handlers.current = { onPinClick, onPick };

  // Cria o mapa uma vez só
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
      [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      12,
    );
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    pinLayerRef.current = L.layerGroup().addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => handlers.current.onPick?.(event.latlng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Alfinetes dos spots
  useEffect(() => {
    const map = mapRef.current;
    const layer = pinLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const pin of pins) {
      L.marker([pin.latitude, pin.longitude], { icon: pinIcon(), title: pin.name, alt: pin.name })
        .on("click", () => handlers.current.onPinClick?.(pin.id))
        .addTo(layer);
    }
    // Enquadra todos os spots na tela
    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [pins]);

  // Alfinete escolhido no modo "escolher lugar"
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!picked) {
      pickedRef.current?.remove();
      pickedRef.current = null;
      return;
    }
    if (pickedRef.current) {
      pickedRef.current.setLatLng(picked);
    } else {
      pickedRef.current = L.marker(picked, { icon: pinIcon(true), alt: "Local escolhido" }).addTo(map);
    }
  }, [picked]);

  useEffect(() => {
    if (focus) mapRef.current?.setView(focus, 16);
  }, [focus]);

  return (
    <div
      ref={containerRef}
      className={[styles.map, className].filter(Boolean).join(" ")}
      role="region"
      aria-label={label}
    />
  );
}

// "Usar minha localização". O navegador só libera o GPS em sites com HTTPS (ou no localhost).
export function locateMe(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext || !("geolocation" in navigator)) {
      reject(new Error("Seu navegador só libera a localização em sites seguros (HTTPS). Marque o lugar clicando no mapa."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => reject(new Error("Não conseguimos pegar sua localização. Marque o lugar clicando no mapa.")),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}
