// Weekly schedule helpers for the shop storefront.
//
// Mirrors the `shops.schedule` jsonb shape from CLAUDE.md:
//   { "mon": {"open":"09:00","close":"18:00"}, "sun": null, ... }
// so the backend can drop a real row in here with no shape change.
// `schedule_overrides` (date-specific exceptions) is NOT handled yet — only the
// recurring weekly pattern, which is all the storefront panel needs for the demo.

export type DayHours = { open: string; close: string } | null;

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type WeeklySchedule = Record<WeekdayKey, DayHours>;

/** Monday-first order (matches how Romanians read a weekly program). */
export const DAY_ORDER: WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<WeekdayKey, string> = {
  mon: "Luni",
  tue: "Marți",
  wed: "Miercuri",
  thu: "Joi",
  fri: "Vineri",
  sat: "Sâmbătă",
  sun: "Duminică",
};

/** Sample weekly hours — placeholder until the BE serves `shops.schedule`. */
export const SAMPLE_SCHEDULE: WeeklySchedule = {
  mon: { open: "08:00", close: "20:00" },
  tue: { open: "08:00", close: "20:00" },
  wed: { open: "08:00", close: "20:00" },
  thu: { open: "08:00", close: "20:00" },
  fri: { open: "08:00", close: "20:00" },
  sat: { open: "09:00", close: "17:00" },
  sun: null,
};

/**
 * Romania's timezone. All open/closed math is wall-clock in Bucharest regardless of where the
 * code runs — Vercel/SSR is UTC and a browser is the visitor's own zone, so the raw `Date` parts
 * (`getHours`/`getDay`) can't be trusted. We derive the Bucharest wall-clock via `Intl` instead
 * (full timezone data ships with Node + every browser).
 */
const TZ = "Europe/Bucharest";

const WEEKDAY_FROM_SHORT: Record<string, WeekdayKey> = {
  Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun",
};

/** The wall-clock "now" in Bucharest, split into the parts the schedule math needs. */
function bucharestNow(now: Date): { key: WeekdayKey; minutes: number; dateKey: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // 00–23 (avoids the "24:00" midnight quirk of hour12:false)
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return {
    key: WEEKDAY_FROM_SHORT[get("weekday")] ?? "mon",
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

/** Add whole days to a YYYY-MM-DD key (anchored at noon UTC so DST never shifts the date). */
function addDaysToKey(dateKey: string, offset: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Today's Monday-first key, in Bucharest wall-clock. */
export function todayKey(now: Date = new Date()): WeekdayKey {
  return bucharestNow(now).key;
}

/** Today's date (YYYY-MM-DD) in Bucharest — for stamping/clearing `schedule_overrides` keys so
 *  the writer agrees with the reader near midnight (override keys are Bucharest calendar dates). */
export function bucharestDateKey(now: Date = new Date()): string {
  return bucharestNow(now).dateKey;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function sameHours(a: DayHours, b: DayHours): boolean {
  if (a === null || b === null) return a === b;
  return a.open === b.open && a.close === b.close;
}

export type ScheduleGroup = {
  days: WeekdayKey[];
  /** "Luni – Vineri" for a range, "Sâmbătă" for a single day. */
  label: string;
  hours: DayHours;
  containsToday: boolean;
};

/** Collapses consecutive days with identical hours into ranges (Monday-first). */
export function groupSchedule(
  schedule: WeeklySchedule,
  now: Date = new Date(),
): ScheduleGroup[] {
  const today = todayKey(now);
  const groups: ScheduleGroup[] = [];

  for (const key of DAY_ORDER) {
    const last = groups[groups.length - 1];
    if (last && sameHours(last.hours, schedule[key])) {
      last.days.push(key);
    } else {
      groups.push({ days: [key], hours: schedule[key], containsToday: false, label: "" });
    }
  }

  for (const g of groups) {
    g.containsToday = g.days.includes(today);
    g.label =
      g.days.length === 1
        ? DAY_LABELS[g.days[0]]
        : `${DAY_LABELS[g.days[0]]} – ${DAY_LABELS[g.days[g.days.length - 1]]}`;
  }

  return groups;
}

export type ScheduleStatus = {
  /** Open right now? */
  open: boolean;
  /** Today's Monday-first key (for highlighting the row). */
  today: WeekdayKey;
  /** Full label, e.g. "Deschis · până la 20:00" / "Închis · deschide luni la 08:00". */
  label: string;
  /** Compact label for tight spots next to an open/closed badge: "până la 20:00" /
   *  "mâine la 09:00" (no "Deschis/Închis/deschide" prefix — the badge already says it). */
  short: string;
};

/**
 * Computes open-now + a short status label from the weekly schedule.
 * Looks ahead up to 7 days to find the next opening when currently closed.
 */
export function getScheduleStatus(
  schedule: WeeklySchedule,
  overrides: Record<string, { open: string; close: string } | null> = {},
  now: Date = new Date(),
): ScheduleStatus {
  const { key: today, minutes: nowMin, dateKey: todayDateKey } = bucharestNow(now);

  // Effective hours for the day `offset` days from now: a date-specific override (incl. a
  // `null` "closed" entry from a temporary pause) wins over the recurring weekly schedule.
  // Dates are Bucharest calendar dates (override keys are stored as local YYYY-MM-DD).
  const hoursFor = (offset: number, weekday: WeekdayKey): { open: string; close: string } | null => {
    const dateKey = addDaysToKey(todayDateKey, offset);
    if (dateKey in overrides) return overrides[dateKey];
    return schedule[weekday];
  };

  const todays = hoursFor(0, today);
  if (todays && nowMin >= toMinutes(todays.open) && nowMin < toMinutes(todays.close)) {
    return {
      open: true,
      today,
      label: `Deschis · până la ${todays.close}`,
      short: `până la ${todays.close}`,
    };
  }

  // Closed now — find the next opening (today later, or a following day).
  const startIdx = DAY_ORDER.indexOf(today);
  for (let offset = 0; offset < 8; offset++) {
    const key = DAY_ORDER[(startIdx + offset) % 7];
    const hours = hoursFor(offset, key);
    if (!hours) continue;
    const opensAt = toMinutes(hours.open);
    if (offset === 0 && nowMin >= opensAt) continue; // already past today's open window
    const whenLong =
      offset === 0
        ? `astăzi la ${hours.open}`
        : offset === 1
          ? `mâine la ${hours.open}`
          : `${DAY_LABELS[key].toLowerCase()} la ${hours.open}`;
    const whenShort =
      offset === 0
        ? `azi la ${hours.open}`
        : offset === 1
          ? `mâine la ${hours.open}`
          : `${DAY_LABELS[key].toLowerCase()} la ${hours.open}`;
    return {
      open: false,
      today,
      label: `Închis · deschide ${whenLong}`,
      short: whenShort,
    };
  }

  return { open: false, today, label: "Închis", short: "Închis azi" };
}
