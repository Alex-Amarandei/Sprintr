"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { IASI_CENTER, type LatLng } from "@/lib/geo/geocode";

/**
 * Interactive OpenStreetMap location picker (plain Leaflet, no API key). Click the map or drag
 * the pin to choose a delivery point; the chosen { lat, lng } flow up via `onPick`. Setting
 * `value` from outside (e.g. "use current location") recenters the pin.
 *
 * Loaded ONLY on the client (dynamic import with `ssr: false`) — Leaflet touches `window` at
 * module load, so it must never run during SSR.
 */

// Inline SVG teardrop pin as a divIcon — avoids Leaflet's default marker PNGs (which break under
// bundlers) and themes the pin via CSS vars (style attr, since vars don't resolve in `fill=`).
const PIN_HTML = `
<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
  <path style="fill:var(--mantine-color-brand-6)" d="M12 0C5.37 0 0 5.37 0 12c0 8.4 10.5 18.7 11.45 19.6a.8.8 0 0 0 1.1 0C13.5 30.7 24 20.4 24 12 24 5.37 18.63 0 12 0z"/>
  <circle style="fill:var(--mantine-color-white)" cx="12" cy="12" r="4.6"/>
</svg>`;

const pinIcon = L.divIcon({
  html: PIN_HTML,
  className: "", // strip Leaflet's default .leaflet-div-icon box/border
  iconSize: [30, 40],
  iconAnchor: [15, 40], // tip of the teardrop
});

export default function LocationPicker({
  value,
  onPick,
  height = 240,
}: {
  value: LatLng | null;
  onPick: (p: LatLng) => void;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Keep the latest onPick without re-running the init effect.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = value ?? IASI_CENTER;

    const map = L.map(containerRef.current).setView([start.lat, start.lng], value ? 16 : 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const marker = L.marker([start.lat, start.lng], { icon: pinIcon, draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      onPickRef.current({ lat, lng });
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    // The map mounts inside a modal that may still be animating/sizing — recalc tile layout
    // once it settles, or it renders as grey tiles.
    const t1 = setTimeout(() => map.invalidateSize(), 0);
    const t2 = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init-once: deliberately not re-running on `value` (synced by the effect below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. geolocation) into the pin, skipping our own picks.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!value || !map || !marker) return;
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - value.lat) < 1e-7 && Math.abs(cur.lng - value.lng) < 1e-7) return;
    marker.setLatLng([value.lat, value.lng]);
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16));
  }, [value]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Hartă pentru selectarea locației de livrare"
      style={{
        height,
        width: "100%",
        borderRadius: "var(--mantine-radius-md)",
        overflow: "hidden",
        // Keep Leaflet's internal panes (high z-index) from escaping above modal chrome.
        zIndex: 0,
        border: "1px solid var(--mantine-color-default-border)",
      }}
    />
  );
}
