import AsyncStorage from "@react-native-async-storage/async-storage";

import type { StoredState, Timer } from "@/types";

const KEY = "qahar-e-hijr/v1";

const empty: StoredState = {
  schemaVersion: 1,
  timers: [],
  widgetTimerId: null,
};

/**
 * AsyncStorage wrapper. Storage failures are logged but never thrown — losing a
 * timer is awful but crashing on launch is worse.
 */
export async function loadState(): Promise<StoredState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (parsed.schemaVersion !== 1) return migrate(parsed);
    return {
      schemaVersion: 1,
      timers: Array.isArray(parsed.timers) ? (parsed.timers as Timer[]) : [],
      widgetTimerId:
        typeof parsed.widgetTimerId === "string" ? parsed.widgetTimerId : null,
    };
  } catch (err) {
    console.warn("[storage] load failed", err);
    return empty;
  }
}

export async function saveState(state: StoredState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[storage] save failed", err);
  }
}

/** Future-proofing: when schemaVersion bumps, transform older shapes here. */
function migrate(_old: Partial<StoredState>): StoredState {
  return empty;
}
