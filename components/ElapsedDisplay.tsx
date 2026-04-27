import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type TextStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useDerivedValue,
  runOnJS,
} from "react-native-reanimated";

import { AnimatedDigit } from "@/components/AnimatedDigit";
import { useNow } from "@/hooks/useNow";
import { colors } from "@/constants/colors";
import { type as typography, tabular } from "@/constants/typography";
import { DURATION } from "@/lib/motion";
import { elapsedAt } from "@/lib/time";
import type { Timer } from "@/types";

type Variant = "hero" | "card" | "compact";

type Props = {
  timer: Timer;
  variant?: Variant;
  color?: string;
};

const VARIANT_STYLES: Record<
  Variant,
  { numberStyle: TextStyle; unitStyle: TextStyle; height: number; gap: number }
> = {
  hero: {
    numberStyle: { ...typography.hero, ...tabular },
    unitStyle: {
      ...typography.body,
      fontFamily: "Inter_500Medium",
      fontSize: 18,
      letterSpacing: 0.4,
    },
    height: 64,
    gap: 6,
  },
  card: {
    numberStyle: { ...typography.cardElapsed, ...tabular },
    unitStyle: {
      ...typography.caption,
      fontFamily: "Inter_500Medium",
      letterSpacing: 0.6,
    },
    height: 32,
    gap: 4,
  },
  compact: {
    numberStyle: {
      ...typography.cardElapsed,
      ...tabular,
      fontSize: 22,
    },
    unitStyle: {
      ...typography.caption,
      fontFamily: "Inter_500Medium",
      letterSpacing: 0.4,
    },
    height: 26,
    gap: 3,
  },
};

/**
 * Live-updating elapsed display. Subscribes to the shared 1Hz clock via a
 * Reanimated derived value, and only triggers React updates when the formatted
 * string actually changes — so the seconds digit re-renders, but the years
 * digit does not (until rollover).
 */
export function ElapsedDisplay({
  timer,
  variant = "card",
  color = colors.textPrimary,
}: Props) {
  const now = useNow();
  const v = VARIANT_STYLES[variant];
  const lastKeyRef = useRef<string>("");

  // We render per-magnitude segments as: [number] [unit-letter]
  const [segments, setSegments] = useState<Segment[]>(() =>
    buildSegments(timer, Date.now()),
  );

  // Closure that runs on the JS thread; captures setSegments + lastKeyRef
  // lexically so we don't have to ship them across the bridge as args.
  const apply = (next: Segment[], key: string) => {
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      setSegments(next);
    }
  };

  // Worklet subscription: recompute segments on the UI thread every tick.
  // Only nudge React when the formatted output actually changed.
  useDerivedValue(() => {
    const next = buildSegmentsWorklet(timer, now.value);
    const key = next.map((s) => `${s.value}${s.unit}`).join("|");
    runOnJS(apply)(next, key);
    return null;
  }, [timer.startedAt, timer.pausedAt, timer.accumulatedPause]);

  // Re-snap on mount in case the timer prop changed.
  useEffect(() => {
    setSegments(buildSegments(timer, Date.now()));
  }, [timer.id, timer.startedAt, timer.pausedAt, timer.accumulatedPause]);

  const numberStyle: TextStyle = { ...v.numberStyle, color };
  const unitStyle: TextStyle = { ...v.unitStyle, color: colors.textSecondary };

  return (
    <View style={[styles.row, { gap: v.gap }]}>
      {segments.map((seg, i) => (
        <View key={`${seg.unit}-${i}`} style={styles.segment}>
          <View style={styles.numberRow}>
            {seg.value.split("").map((ch, idx) => (
              <AnimatedDigit
                key={`${seg.unit}-${idx}`}
                value={ch}
                textStyle={numberStyle}
                height={v.height}
                width={charWidth(numberStyle.fontSize ?? 28)}
              />
            ))}
          </View>
          <Animated.Text
            entering={FadeIn.duration(DURATION.base)}
            exiting={FadeOut.duration(DURATION.base)}
            style={unitStyle}
          >
            {seg.unit}
          </Animated.Text>
          {i < segments.length - 1 ? (
            <View style={styles.dotWrap}>
              <Animated.Text style={[unitStyle, styles.dot]}>·</Animated.Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

type Segment = { value: string; unit: string };

/** JS version (mount/refresh path). */
function buildSegments(t: Timer, now: number): Segment[] {
  const e = elapsedAt(t, now);
  return chooseSegments(e.years, e.months, e.days, e.hours, e.minutes, e.seconds);
}

/**
 * Worklet version. Inlined math (no closures over JS-only modules) so it can
 * run on the UI thread.
 */
function buildSegmentsWorklet(t: Timer, now: number): Segment[] {
  "worklet";
  const ref = t.pausedAt ?? now;
  const totalMs = Math.max(0, ref - t.startedAt - t.accumulatedPause);
  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const MONTH = Math.round(30.4375 * DAY);
  const YEAR = Math.round(365.25 * DAY);

  let r = totalMs;
  const years = Math.floor(r / YEAR);
  r -= years * YEAR;
  const months = Math.floor(r / MONTH);
  r -= months * MONTH;
  const days = Math.floor(r / DAY);
  r -= days * DAY;
  const hours = Math.floor(r / HOUR);
  r -= hours * HOUR;
  const minutes = Math.floor(r / MIN);
  r -= minutes * MIN;
  const seconds = Math.floor(r / SEC);

  return chooseSegments(years, months, days, hours, minutes, seconds);
}

function chooseSegments(
  years: number,
  months: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
): Segment[] {
  "worklet";
  if (years > 0) {
    return [
      { value: String(years), unit: "y" },
      { value: String(months), unit: "mo" },
      { value: String(days), unit: "d" },
    ];
  }
  if (months > 0) {
    return [
      { value: String(months), unit: "mo" },
      { value: String(days), unit: "d" },
      { value: String(hours), unit: "h" },
    ];
  }
  if (days > 0) {
    return [
      { value: String(days), unit: "d" },
      { value: String(hours), unit: "h" },
      { value: String(minutes), unit: "m" },
    ];
  }
  if (hours > 0) {
    return [
      { value: String(hours), unit: "h" },
      { value: pad2(minutes), unit: "m" },
      { value: pad2(seconds), unit: "s" },
    ];
  }
  return [
    { value: String(minutes), unit: "m" },
    { value: pad2(seconds), unit: "s" },
  ];
}

function pad2(n: number): string {
  "worklet";
  return n < 10 ? `0${n}` : String(n);
}


/** Approximate width per character at a given font size. Fraunces tabular-nums
 * is roughly 0.55em wide; we round up for safety so digits never crowd. */
function charWidth(fontSize: number): number {
  return Math.ceil(fontSize * 0.6);
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end" },
  segment: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  numberRow: { flexDirection: "row", alignItems: "flex-end" },
  dotWrap: { paddingHorizontal: 6, paddingBottom: 2 },
  dot: { fontSize: 16, opacity: 0.5 },
});
