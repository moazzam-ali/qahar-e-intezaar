import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type TextStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DURATION, EASE_OUT } from "@/lib/motion";

type Props = {
  /** Single digit (0-9) or punctuation (':', ' '). */
  value: string;
  textStyle: TextStyle;
  /** Slot height in px — needed for the slide distance. */
  height: number;
  /** Slot width in px. Tabular-nums keeps this stable. */
  width?: number;
};

/**
 * One slot of a digit display. When `value` changes, the outgoing glyph slides
 * up + fades out while the incoming glyph slides in from below — buttery via
 * Reanimated worklets, no JS-thread re-renders mid-animation.
 *
 * Punctuation (':', ' ', '·') passes through without animation.
 */
export function AnimatedDigit({ value, textStyle, height, width }: Props) {
  const reduced = useReducedMotion();
  const [previous, setPrevious] = useState(value);
  const initialMount = useRef(true);
  const progress = useSharedValue(1);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (value === previous) return;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: reduced ? 80 : DURATION.digit,
      easing: EASE_OUT,
    });
    // Wait one tick before "consuming" the previous value so the outgoing
    // glyph has a chance to be rendered with progress=0 before crossfading.
    const t = setTimeout(() => setPrevious(value), reduced ? 90 : DURATION.digit + 20);
    return () => clearTimeout(t);
  }, [value, previous, progress, reduced]);

  const slide = height * 0.45;

  const outStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -progress.value * slide }],
  }));

  const inStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * slide }],
  }));

  // Punctuation: no animation needed.
  const isPunctuation = !/^[0-9]$/.test(value);
  if (isPunctuation) {
    return (
      <View style={[styles.slot, { height, width: width ?? undefined }]}>
        <Animated.Text style={[textStyle, styles.glyph]}>{value}</Animated.Text>
      </View>
    );
  }

  return (
    <View style={[styles.slot, { height, width: width ?? undefined }]}>
      {value !== previous ? (
        <Animated.Text style={[textStyle, styles.glyph, outStyle]}>
          {previous}
        </Animated.Text>
      ) : null}
      <Animated.Text style={[textStyle, styles.glyph, inStyle]}>
        {value}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    position: "absolute",
    textAlign: "center",
  },
});
