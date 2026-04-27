import { useEffect } from "react";
import { AppState } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";

/**
 * A single app-wide 1Hz clock, exposed as a Reanimated shared value.
 *
 * Components that need the current time should subscribe via `useNow()` and
 * read `now.value` inside derived values / worklets — this avoids React
 * re-renders on every tick. Animation logic stays on the UI thread.
 *
 * On background → foreground we immediately rebase to Date.now() so timers
 * stay accurate even after long-running interruptions (the JS interval may
 * have been throttled or stopped while backgrounded).
 */
let interval: ReturnType<typeof setInterval> | null = null;
let refCount = 0;
const sharedNow = { current: null as SharedValue<number> | null };

export function useNow(): SharedValue<number> {
  const local = useSharedValue<number>(Date.now());

  useEffect(() => {
    if (!sharedNow.current) sharedNow.current = local;

    refCount += 1;

    if (!interval) {
      interval = setInterval(() => {
        if (sharedNow.current) sharedNow.current.value = Date.now();
      }, 1000);
    }

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && sharedNow.current) {
        sharedNow.current.value = Date.now();
      }
    });

    return () => {
      refCount -= 1;
      sub.remove();
      if (refCount <= 0 && interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [local]);

  return sharedNow.current ?? local;
}
