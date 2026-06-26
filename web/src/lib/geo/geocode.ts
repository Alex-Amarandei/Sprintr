/**
 * Lightweight geo helpers for the checkout location picker. No API key, no SDK:
 *  - reverse geocoding via OpenStreetMap Nominatim (free, CORS-enabled),
 *  - the browser Geolocation API wrapped as a promise,
 *  - a Google Maps deep-link builder (pin-exact when coords exist, else address search).
 *
 * Everything is best-effort: on any failure the caller keeps whatever the user typed, so the
 * checkout never depends on these succeeding.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Iași center — default map view + first/only market (no city column by design). */
export const IASI_CENTER: LatLng = { lat: 47.1585, lng: 27.6014 };

/**
 * Reverse-geocode coordinates to a human-readable address (Romanian) via Nominatim.
 * Returns null on any failure so the caller can keep the coords and let the user type.
 */
export async function reverseGeocode({ lat, lng }: LatLng): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=18&accept-language=ro`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Forward-geocode an address string to coordinates (Nominatim). Used server-side to derive a
 * shop's location from its typed address. Returns null on any failure (caller keeps coords
 * unchanged). A User-Agent is required by Nominatim's policy for non-browser (server) callers.
 */
export async function forwardGeocode(address: string): Promise<LatLng | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    // Constrain to Iași (the only market) so ambiguous street names resolve to the city — not a
    // same-named street elsewhere. A truly unlocatable address returns null → the shop keeps no
    // coords → the radius check stays "allowed" (better than a mis-located false block).
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1` +
      `&accept-language=ro&bounded=1&viewbox=27.48,47.25,27.70,47.08` +
      `&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Sprintr/1.0 (stationery delivery, Iași)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = data[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

/** Max delivery distance (km): orders to a drop-off farther than this from the shop are blocked. */
export const MAX_DELIVERY_KM = 12;

/** Great-circle distance in kilometres between two points (Haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius, km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The browser's current position as a promise. Resolves null when geolocation is
 * unavailable, denied, or times out — never rejects, so callers stay simple.
 */
export function getCurrentPosition(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

/** Google Maps link — pin-exact when coords exist, else a search on the address text. */
export function mapsLink(opts: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}): string | null {
  if (opts.lat != null && opts.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${opts.lat},${opts.lng}`;
  }
  if (opts.address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opts.address)}`;
  }
  return null;
}
