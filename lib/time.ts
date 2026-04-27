import type { Elapsed, Timer } from "@/types";

/**
 * Compute elapsed time from a timer at a given clock instant.
 *
 * If the timer is paused, the clock is "frozen" at pausedAt. Otherwise the
 * given `now` is used. We then subtract any prior accumulated pause time.
 */
export function elapsedAt(timer: Timer, now: number): Elapsed {
  const reference = timer.pausedAt ?? now;
  const totalMs = Math.max(
    0,
    reference - timer.startedAt - timer.accumulatedPause,
  );

  // Approximate calendar units. We use 30.4375d/month and 365.25d/year so the
  // breakdown is stable across any pair of dates without relying on calendar
  // weirdness — this is "human readable", not legal-grade.
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = Math.round(30.4375 * DAY);
  const YEAR = Math.round(365.25 * DAY);

  let remaining = totalMs;
  const years = Math.floor(remaining / YEAR);
  remaining -= years * YEAR;
  const months = Math.floor(remaining / MONTH);
  remaining -= months * MONTH;
  const days = Math.floor(remaining / DAY);
  remaining -= days * DAY;
  const hours = Math.floor(remaining / HOUR);
  remaining -= hours * HOUR;
  const minutes = Math.floor(remaining / MINUTE);
  remaining -= minutes * MINUTE;
  const seconds = Math.floor(remaining / SECOND);

  return { totalMs, years, months, days, hours, minutes, seconds };
}

/**
 * Adapt a compact widget-style format to the magnitude of the elapsed time.
 *   <1h:   "42m 17s"
 *   <1d:   "5h 42m"
 *   <1mo:  "12d 5h 42m"
 *   <1y:   "3mo 12d 5h"
 *   >=1y:  "3y 4mo 12d"
 */
export function formatCompact(e: Elapsed): string {
  if (e.years > 0) return `${e.years}y · ${e.months}mo · ${e.days}d`;
  if (e.months > 0) return `${e.months}mo · ${e.days}d · ${e.hours}h`;
  if (e.days > 0) return `${e.days}d · ${e.hours}h · ${e.minutes}m`;
  if (e.hours > 0) return `${e.hours}h · ${e.minutes}m`;
  return `${e.minutes}m · ${pad2(e.seconds)}s`;
}

/** Long-form, sentence-shaped readout used in detail view. */
export function formatHuman(e: Elapsed): string {
  const parts: string[] = [];
  if (e.years) parts.push(plural(e.years, "year"));
  if (e.months) parts.push(plural(e.months, "month"));
  if (e.days) parts.push(plural(e.days, "day"));
  if (!e.years && !e.months) {
    if (e.hours) parts.push(plural(e.hours, "hour"));
    if (!e.days && e.minutes) parts.push(plural(e.minutes, "minute"));
  }
  if (parts.length === 0) return "Just now";
  if (parts.length === 1) return parts[0]!;
  const last = parts.pop()!;
  return `${parts.join(", ")}, ${last}`;
}

/** HH:MM:SS for short elapsed times. Years/months/days roll into HH cap. */
export function formatClock(e: Elapsed): string {
  // Sum days into hours so a long timer still reads HH:MM:SS coherently.
  const totalHours =
    e.years * Math.round(365.25) * 24 + e.months * Math.round(30.4375) * 24 +
    e.days * 24 + e.hours;
  return `${pad2(totalHours)}:${pad2(e.minutes)}:${pad2(e.seconds)}`;
}

/** Total whole days elapsed — useful for detail view "1,247 days" line. */
export function totalDays(e: Elapsed): number {
  return Math.floor(e.totalMs / (24 * 60 * 60 * 1000));
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
