import { format } from "date-fns";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ElapsedDisplay } from "@/components/ElapsedDisplay";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { hapticPress } from "@/hooks/useHaptic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DURATION, EASE_OUT } from "@/lib/motion";
import type { Timer } from "@/types";

type Props = {
  timer: Timer;
  /** Optional long-press hook (e.g. to open quick actions). */
  onLongPress?: (timer: Timer) => void;
};

/**
 * One row in the home list. Tap → detail. Long-press → quick actions.
 *
 * Press feedback is implemented as a Reanimated worklet so it never blocks the
 * JS thread (which is busy with the per-second elapsed updates).
 */
export function TimerCard({ timer, onLongPress }: Props) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = () => {
    scale.value = withTiming(0.98, { duration: 120, easing: EASE_OUT });
    opacity.value = withTiming(0.92, { duration: 120, easing: EASE_OUT });
  };
  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 180, easing: EASE_OUT });
    opacity.value = withTiming(1, { duration: 180, easing: EASE_OUT });
  };

  const startedLine = `Started ${format(new Date(timer.startedAt), "EEE, d MMM yyyy")}`;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${timer.label}, ${startedLine}`}
        onPress={() => router.push(`/timer/${timer.id}`)}
        onLongPress={() => {
          hapticPress();
          onLongPress?.(timer);
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        delayLongPress={reduced ? 320 : 280}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: timer.color }]} />
          <Text style={styles.label} numberOfLines={1}>
            {timer.icon ? `${timer.icon}  ` : ""}
            {timer.label}
          </Text>
          {timer.pausedAt !== null ? (
            <Text style={styles.pausedTag}>PAUSED</Text>
          ) : null}
        </View>

        <ElapsedDisplay timer={timer} variant="card" />

        <Text style={styles.startedAt} numberOfLines={1}>
          {startedLine}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  pausedTag: {
    ...typography.caption,
    fontFamily: "Inter_500Medium",
    color: colors.textTertiary,
    letterSpacing: 0.6,
  },
  startedAt: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
