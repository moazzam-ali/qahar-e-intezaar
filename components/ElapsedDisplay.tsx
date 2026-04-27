import { useMemo } from "react";
import { StyleSheet, Text, View, type TextStyle } from "react-native";

import { AnimatedDigit } from "@/components/AnimatedDigit";
import { useNow } from "@/hooks/useNow";
import { colors } from "@/constants/colors";
import { type as typography, tabular } from "@/constants/typography";
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
 * Live-updating elapsed display. Subscribes to the shared 1Hz JS clock and
 * recomputes segments via `useMemo`. The per-glyph slide animation lives in
 * `AnimatedDigit` and is driven by prop changes — completely independent of
 * how the parent ticks.
 *
 * No worklets here on purpose: an earlier implementation drove digits from a
 * Reanimated `useDerivedValue` that called `runOnJS` with arrays of objects
 * across the worklet boundary, which crashed on second-mount under release
 * builds. The simple JS path below is reliable and the cost is one React
 * re-render per second per visible card — well inside our perf budget.
 */
export function ElapsedDisplay({
  timer,
  variant = "card",
  color = colors.textPrimary,
}: Props) {
  const now = useNow();
  const v = VARIANT_STYLES[variant];

  const segments = useMemo(
    () => buildSegments(timer, now),
    [timer.startedAt, timer.pausedAt, timer.accumulatedPause, now],
  );
  const secondsLine = useMemo(
    () => buildSecondsLine(timer, now),
    [timer.startedAt, timer.pausedAt, timer.accumulatedPause, now],
  );

  const numberStyle: TextStyle = { ...v.numberStyle, color };
  const unitStyle: TextStyle = { ...v.unitStyle, color: colors.textSecondary };
  const secondsStyle: TextStyle = {
    ...typography.caption,
    fontFamily: "Inter_500Medium",
    color: colors.textSecondary,
    letterSpacing: 0.4,
  };

  return (
    <View style={styles.stack}>
      <View style={[styles.row, { gap: v.gap }]}>
        {segments.map((seg, i) => (
          <View key={seg.unit} style={styles.segment}>
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
            <Text style={[unitStyle, styles.unit]}>{seg.unit}</Text>
            {i < segments.length - 1 ? (
              <Text style={[unitStyle, styles.dot]}>·</Text>
            ) : null}
          </View>
        ))}
      </View>
      {secondsLine ? (
        <Text style={[secondsStyle, styles.secondsLine]}>{secondsLine}</Text>
      ) : null}
    </View>
  );
}

type Segment = { value: string; unit: string };

function buildSegments(t: Timer, now: number): Segment[] {
  const e = elapsedAt(t, now);
  return chooseSegments(e.years, e.months, e.days, e.hours, e.minutes, e.seconds);
}

function chooseSegments(
  years: number,
  months: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
): Segment[] {
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

/**
 * The bottom seconds line. We render it below the magnitude row whenever the
 * top row doesn't already carry seconds (i.e. when the timer is at days+
 * scale). Mirrors the widget's `Chronometer` line.
 */
function buildSecondsLine(t: Timer, now: number): string | null {
  const e = elapsedAt(t, now);
  if (e.hours === 0 && e.days === 0 && e.months === 0 && e.years === 0) {
    return null; // already shown as a primary segment
  }
  if (e.days === 0 && e.months === 0 && e.years === 0) {
    return null; // hours scale: seconds are already in primary segments
  }
  const totalSec = Math.floor(e.totalMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function charWidth(fontSize: number): number {
  return Math.ceil(fontSize * 0.6);
}

const styles = StyleSheet.create({
  stack: { flexDirection: "column", alignItems: "flex-start", gap: 2 },
  row: { flexDirection: "row", alignItems: "flex-end" },
  segment: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  numberRow: { flexDirection: "row", alignItems: "flex-end" },
  unit: { paddingBottom: 4, paddingLeft: 2 },
  dot: { paddingHorizontal: 6, paddingBottom: 4, fontSize: 16, opacity: 0.5 },
  secondsLine: { marginTop: 2 },
});
