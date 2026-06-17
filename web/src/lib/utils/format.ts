/** 1–2 letter initials from a display name (avatar fallback). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatPrice(amount: number, currency = "RON"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Romanian count + noun with correct singular/plural.
 * 1 → singular ("1 câmp"); 0 and 2–19 → plural, no "de" ("0 câmpuri", "3 câmpuri");
 * ≥20 → "de" + plural ("20 de câmpuri"). Covers the cases in the app.
 */
export function roCount(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  if (n === 0) return `0 ${many}`;
  const mod100 = n % 100;
  const needsDe = mod100 === 0 || mod100 > 19;
  return `${n} ${needsDe ? "de " : ""}${many}`;
}

/**
 * Normalize a free-typed time into "HH:mm". "2359" → "23:59", "900" → "09:00",
 * "9" → "09:00". Light-clamps to a valid time so an obvious typo never persists.
 * Returns "" for an empty/no-digit value. Meant for an onBlur formatter.
 */
export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  let hh: string, mm: string;
  if (digits.length <= 2) {
    hh = digits.padStart(2, "0");
    mm = "00";
  } else {
    const d = digits.slice(0, 4);
    mm = d.slice(-2);
    hh = d.slice(0, -2).padStart(2, "0");
  }
  const h = Math.min(23, parseInt(hh, 10));
  const m = Math.min(59, parseInt(mm, 10));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
