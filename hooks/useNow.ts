import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * A 1Hz JS clock for ticking elapsed displays.
 *
 * Returns a number (unix ms) that updates roughly every `intervalMs`. Each
 * subscriber gets its own React state, so re-renders happen on the JS thread
 * only for components that read this value.
 *
 * Performance: with `intervalMs=1000` and a list of N TimerCards, you pay N
 * React re-renders per second — fine for our scale (≤ a few dozen on screen).
 *
 * Resilience: rebases to `Date.now()` on background → foreground so the OS
 * throttling the JS interval while backgrounded doesn't leave us showing a
 * stale value when the user comes back.
 *
 * Earlier versions used a Reanimated `SharedValue` singleton with refcount,
 * but that pattern broke for any second-mounted consumer (singleton race) and
 * couldn't drive React state updates without `runOnJS`, which fed too much
 * complexity into the per-tick hot path. The simple version below is faster
 * to reason about and avoids the white-screen-on-second-render footgun.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let mounted = true;
    const id = setInterval(() => {
      if (mounted) setNow(Date.now());
    }, intervalMs);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && mounted) setNow(Date.now());
    });

    return () => {
      mounted = false;
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
