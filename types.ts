import type { TimerColor } from "@/constants/palette";

/**
 * A single hijr (separation) timer.
 *
 * Source of truth is `startedAt` (unix ms). Elapsed is always recomputed
 * — never stored — so no drift, no clock-skew bugs.
 *
 * `pausedAt` and `accumulatedPause` together model pause/resume:
 *   - while running: pausedAt = null, accumulatedPause holds total prior pauses
 *   - while paused: pausedAt = the moment we paused, accumulatedPause unchanged
 */
export type Timer = {
  id: string;
  label: string;
  startedAt: number;
  pausedAt: number | null;
  accumulatedPause: number;
  color: TimerColor;
  icon?: string;
  archived: boolean;
  createdAt: number;
};

/** Persisted shape — bumped when storage format changes. */
export type StoredState = {
  schemaVersion: 1;
  timers: Timer[];
  widgetTimerId: string | null;
};

/** Computed from a Timer + a clock value, not stored. */
export type Elapsed = {
  totalMs: number;
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};
