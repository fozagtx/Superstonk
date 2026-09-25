export type Frequency = "daily" | "weekly" | "monthly";

export const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly"];

export function frequencyLabel(f: Frequency): string {
  return { daily: "Daily", weekly: "Weekly", monthly: "Monthly" }[f];
}

// Next run after `from`, snapped to the top of the UTC hour.
export function nextRunAt(frequency: Frequency, from: Date): Date {
  const d = new Date(from);
  d.setUTCMinutes(0, 0, 0);
  if (d <= from) d.setUTCHours(d.getUTCHours() + 1);
  switch (frequency) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
  }
  return d;
}
