import "server-only";
import crypto from "crypto";
import { haversineKm } from "@/lib/geo/geocode";
import type { DeliveryDispatch, DeliveryPoint, DeliveryQuote } from "./types";

/**
 * Glovo Logistics-as-a-Service (Business / "On-Demand") API client — use Glovo couriers to
 * deliver Sprintr's own orders (pickup at the shop → drop-off at the customer).
 *
 * FULLY GATED: every function no-ops (returns null/false) unless GLOVO_API_KEY + GLOVO_API_SECRET
 * are set, so the live order flow is unaffected until real credentials exist. Never throws —
 * callers treat a null result as "no courier" and fall back to the shop's own delivery.
 *
 * Endpoints + payload shapes are from the public Glovo Business API + community SDKs:
 *   POST /orders/estimate · POST /orders · GET /orders/{id} · GET /orders/{id}/glover-info ·
 *   POST /orders/{id}/cancel   (addresses[]: { type:'PICKUP'|'DELIVERY', lat, lon, ... })
 *
 * TODO(glovo): with sandbox credentials in hand, confirm two things against the live docs and
 * adjust ONLY the marked spots below: (1) the exact auth header / request-signing scheme in
 * `authHeaders`, and (2) whether prices come back in minor units (the `/ 100` in `glovoEstimate`).
 */

// `GLOVO_API_ENV=mock` runs the whole flow with realistic fake data (no Glovo account / keys
// needed) so the integration can be demoed + tested end-to-end before real credentials exist.
const MOCK = process.env.GLOVO_API_ENV === "mock";
const BASE =
  process.env.GLOVO_API_ENV === "production"
    ? "https://business.glovoapp.com"
    : "https://business.testglovo.com";
const API_KEY = process.env.GLOVO_API_KEY ?? "";
const API_SECRET = process.env.GLOVO_API_SECRET ?? "";

export const GLOVO_PROVIDER = "glovo";

/** Active when real credentials are configured, or in mock mode (for testing without an account). */
export function isGlovoEnabled(): boolean {
  return MOCK || Boolean(API_KEY && API_SECRET);
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── Auth ────────────────────────────────────────────────────────────────────────
// TODO(glovo): confirm against the sandbox API docs. Glovo's Business API authenticates with the
// API key + secret; the exact header(s) / HMAC signing may differ from this baseline.
function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: API_KEY,
  };
}

// ── Low-level request ─────────────────────────────────────────────────────────────
async function call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  if (!isGlovoEnabled()) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[glovo] ${method} ${path} → ${res.status}`, await res.text().catch(() => ""));
      return null;
    }
    return (await res.json().catch(() => null)) as T | null;
  } catch (e) {
    console.error(`[glovo] ${method} ${path} failed:`, e);
    return null;
  }
}

function toAddress(p: DeliveryPoint, type: "PICKUP" | "DELIVERY") {
  return {
    type,
    lat: p.lat,
    lon: p.lng,
    label: p.address || undefined,
    details: p.details || undefined,
    contactPerson: p.contactName || undefined,
    contactPhone: p.contactPhone || undefined,
  };
}

// ── Operations ────────────────────────────────────────────────────────────────────

/** Quote the courier fee for a pickup → drop-off leg. */
export async function glovoEstimate(
  pickup: DeliveryPoint,
  dropoff: DeliveryPoint,
): Promise<DeliveryQuote | null> {
  if (MOCK) {
    const km = haversineKm({ lat: pickup.lat, lng: pickup.lng }, { lat: dropoff.lat, lng: dropoff.lng });
    return { provider: GLOVO_PROVIDER, fee: round2(7 + 1.3 * km), currency: "RON", etaMinutes: Math.round(15 + km * 3) };
  }
  const data = await call<{
    estimatedPrice?: { amount?: number; currencyCode?: string };
    price?: { amount?: number; currencyCode?: string };
  }>("POST", "/orders/estimate", {
    scheduleTime: null,
    addresses: [toAddress(pickup, "PICKUP"), toAddress(dropoff, "DELIVERY")],
  });
  const price = data?.estimatedPrice ?? data?.price;
  if (price?.amount == null) return null;
  // TODO(glovo): confirm whether `amount` is minor units (bani). Assuming cents → /100.
  return { provider: GLOVO_PROVIDER, fee: Number(price.amount) / 100, currency: price.currencyCode ?? "RON" };
}

/** Dispatch a Glovo courier for the leg. Returns the dispatch to freeze on the order. */
export async function glovoCreateDelivery(opts: {
  pickup: DeliveryPoint;
  dropoff: DeliveryPoint;
  description: string;
}): Promise<DeliveryDispatch | null> {
  if (MOCK) {
    const m = opts.description.match(/#([a-z0-9]+)/i);
    return {
      provider: GLOVO_PROVIDER,
      ref: `MOCK-${m?.[1] ?? "000000"}`,
      status: "SCHEDULED",
      trackingUrl: "https://glovoapp.com/",
      courierName: "Curier Glovo (test)",
      courierPhone: "+40 712 345 678",
    };
  }
  const data = await call<{
    orderId?: string | number;
    id?: string | number;
    state?: string;
    status?: string;
    trackingUrl?: string;
  }>("POST", "/orders", {
    scheduleTime: null,
    description: opts.description,
    addresses: [toAddress(opts.pickup, "PICKUP"), toAddress(opts.dropoff, "DELIVERY")],
  });
  const ref = data?.orderId ?? data?.id;
  if (ref == null) return null;
  return {
    provider: GLOVO_PROVIDER,
    ref: String(ref),
    status: String(data?.state ?? data?.status ?? "CREATED"),
    trackingUrl: data?.trackingUrl ?? null,
  };
}

/** Current courier status + (when assigned) the courier's name & phone. */
export async function glovoTrack(
  ref: string,
): Promise<{ status: string; courierName: string | null; courierPhone: string | null } | null> {
  if (MOCK) {
    return { status: "DELIVERING", courierName: "Curier Glovo (test)", courierPhone: "+40 712 345 678" };
  }
  const order = await call<{ state?: string; status?: string }>("GET", `/orders/${ref}`);
  if (!order) return null;
  const glover = await call<{ name?: string; phone?: string }>("GET", `/orders/${ref}/glover-info`);
  return {
    status: String(order.state ?? order.status ?? ""),
    courierName: glover?.name ?? null,
    courierPhone: glover?.phone ?? null,
  };
}

/** Cancel a dispatched courier (best-effort). */
export async function glovoCancel(ref: string): Promise<boolean> {
  if (MOCK) return true;
  return (await call<unknown>("POST", `/orders/${ref}/cancel`)) !== null;
}

/**
 * Verify a Glovo webhook's HMAC-SHA256 signature against GLOVO_API_SECRET.
 * TODO(glovo): confirm the signature header name + algorithm against the docs.
 */
export function verifyGlovoWebhook(rawBody: string, signature: string | null): boolean {
  if (!API_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", API_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
