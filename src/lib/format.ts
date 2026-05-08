/**
 * Operational formatting helpers — quantities, dates, relative time.
 * Kept dependency-free for easy server use.
 */

export type QuantityUnit = "case" | "unit" | "pack" | "box";

export function formatQuantity(count: number, unit: QuantityUnit): string {
  const safe = Math.max(0, Math.round(count));
  const plural = safe === 1 ? unit : `${unit}s`;
  return `${safe} ${plural}`;
}

const RELATIVE_DIVISIONS: Array<{ amount: number; name: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, name: "second" },
  { amount: 60, name: "minute" },
  { amount: 24, name: "hour" },
  { amount: 7, name: "day" },
  { amount: 4.34524, name: "week" },
  { amount: 12, name: "month" },
  { amount: Number.POSITIVE_INFINITY, name: "year" },
];

/**
 * Calm relative-time formatter. Uses Intl when available; falls back to "just now".
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let duration = (date.getTime() - now.getTime()) / 1000;

  for (const division of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.name);
    }
    duration /= division.amount;
  }
  return formatter.format(Math.round(duration), "year");
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
