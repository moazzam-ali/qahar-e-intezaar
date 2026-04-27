import { create } from "zustand";

import { DEFAULT_TIMER_COLOR, type TimerColor } from "@/constants/palette";
import { loadState, saveState } from "@/lib/storage";
import {
  syncTimersToWidget,
  syncWidgetTimerId,
} from "@/lib/shared-storage";
import type { StoredState, Timer } from "@/types";

type CreateInput = {
  label: string;
  startedAt?: number;
  color?: TimerColor;
  icon?: string;
};

type State = {
  hydrated: boolean;
  timers: Timer[];
  widgetTimerId: string | null;
  hydrate: () => Promise<void>;
  create: (input: CreateInput) => Timer;
  update: (id: string, patch: Partial<Pick<Timer, "label" | "color" | "icon" | "startedAt">>) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  reset: (id: string) => void;
  archive: (id: string) => void;
  remove: (id: string) => void;
  setWidgetTimerId: (id: string | null) => void;
};

/**
 * In-memory store. Every mutation persists asynchronously to AsyncStorage and
 * mirrors to shared storage so the home-screen widget stays in sync.
 */
export const useTimerStore = create<State>((set, get) => ({
  hydrated: false,
  timers: [],
  widgetTimerId: null,

  hydrate: async () => {
    const initial = await loadState();
    set({
      hydrated: true,
      timers: initial.timers,
      widgetTimerId: initial.widgetTimerId,
    });
    void syncTimersToWidget(initial.timers);
    void syncWidgetTimerId(initial.widgetTimerId);
  },

  create: (input) => {
    const now = Date.now();
    const timer: Timer = {
      id: cryptoRandomId(),
      label: input.label.trim().slice(0, 60),
      startedAt: input.startedAt ?? now,
      pausedAt: null,
      accumulatedPause: 0,
      color: input.color ?? DEFAULT_TIMER_COLOR,
      icon: input.icon,
      archived: false,
      createdAt: now,
    };
    const next = [timer, ...get().timers];
    set({ timers: next, widgetTimerId: get().widgetTimerId ?? timer.id });
    persist(get);
    return timer;
  },

  update: (id, patch) => {
    set({
      timers: get().timers.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    });
    persist(get);
  },

  pause: (id) => {
    const now = Date.now();
    set({
      timers: get().timers.map((t) =>
        t.id === id && t.pausedAt === null ? { ...t, pausedAt: now } : t,
      ),
    });
    persist(get);
  },

  resume: (id) => {
    const now = Date.now();
    set({
      timers: get().timers.map((t) => {
        if (t.id !== id || t.pausedAt === null) return t;
        const pauseDuration = now - t.pausedAt;
        return {
          ...t,
          pausedAt: null,
          accumulatedPause: t.accumulatedPause + pauseDuration,
        };
      }),
    });
    persist(get);
  },

  reset: (id) => {
    const now = Date.now();
    set({
      timers: get().timers.map((t) =>
        t.id === id
          ? { ...t, startedAt: now, pausedAt: null, accumulatedPause: 0 }
          : t,
      ),
    });
    persist(get);
  },

  archive: (id) => {
    set({
      timers: get().timers.map((t) =>
        t.id === id ? { ...t, archived: true } : t,
      ),
    });
    // If the archived timer was the widget pick, fall back to most-recent active.
    if (get().widgetTimerId === id) {
      const fallback = get().timers.find((t) => !t.archived && t.id !== id);
      set({ widgetTimerId: fallback?.id ?? null });
    }
    persist(get);
  },

  remove: (id) => {
    set({ timers: get().timers.filter((t) => t.id !== id) });
    if (get().widgetTimerId === id) {
      const fallback = get().timers.find((t) => !t.archived);
      set({ widgetTimerId: fallback?.id ?? null });
    }
    persist(get);
  },

  setWidgetTimerId: (id) => {
    set({ widgetTimerId: id });
    persist(get);
  },
}));

function persist(get: () => State) {
  const { timers, widgetTimerId } = get();
  const snapshot: StoredState = {
    schemaVersion: 1,
    timers,
    widgetTimerId,
  };
  void saveState(snapshot);
  void syncTimersToWidget(timers);
  void syncWidgetTimerId(widgetTimerId);
}

/**
 * Compact, collision-resistant id. We don't need cryptographic strength —
 * just enough entropy that two timers created in the same second don't collide.
 */
function cryptoRandomId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

/** Convenience selector: only active (non-archived) timers, newest-first. */
export const selectActiveTimers = (s: State): Timer[] =>
  s.timers.filter((t) => !t.archived);

/** Convenience selector: lookup by id (returns undefined if missing). */
export const selectTimerById =
  (id: string) =>
  (s: State): Timer | undefined =>
    s.timers.find((t) => t.id === id);
