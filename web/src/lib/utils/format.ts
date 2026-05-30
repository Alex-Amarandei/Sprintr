export function formatPrice(amount: number, currency = "RON"): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Romanian count + noun with correct singular/plural.
 * 1 → singular ("1 câmp"); 2–19 → plural ("3 câmpuri"); ≥20 (and 0) → "de" + plural
 * ("20 de câmpuri"). Covers the cases in the app.
 */
export function roCount(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  const mod100 = n % 100;
  const needsDe = n === 0 || mod100 === 0 || mod100 > 19;
  return `${n} ${needsDe ? "de " : ""}${many}`;
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
