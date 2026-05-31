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
