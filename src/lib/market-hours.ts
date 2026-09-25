// US stock market hours: 9:30am-4:00pm ET, Monday-Friday, minus NYSE holidays.
// Used for the "Wall St closed — agent still trading" badge.

// NYSE full-day holidays, as ET calendar dates.
const HOLIDAYS = new Set([
  // 2026
  "2026-01-01",
  "2026-01-19",
  "2026-02-16",
  "2026-04-03",
  "2026-05-25",
  "2026-07-03",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
  // 2027
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26",
  "2027-05-31",
  "2027-07-05",
  "2027-09-06",
  "2027-11-25",
  "2027-12-24",
]);

const etParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export interface EtNow {
  date: string; // YYYY-MM-DD in ET
  weekday: string;
  minutes: number; // minutes since ET midnight
}

export function etNow(at: Date): EtNow {
  const parts = Object.fromEntries(
    etParts.formatToParts(at).map((p) => [p.type, p.value]),
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    minutes: hour * 60 + Number(parts.minute),
  };
}

export function isUsMarketOpen(at: Date): boolean {
  const { date, weekday, minutes } = etNow(at);
  if (weekday === "Sat" || weekday === "Sun") return false;
  if (HOLIDAYS.has(date)) return false;
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}

export function marketStatus(at: Date): { open: boolean; label: string } {
  return isUsMarketOpen(at)
    ? { open: true, label: "US markets open" }
    : { open: false, label: "Wall St closed — agent still trading" };
}
