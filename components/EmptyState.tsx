import { Plus } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = { onStart: () => void };

/**
 * Quiet centered state with a slow vertical drift on the "+". Like a slow
 * breath — visible only because nothing else is on the screen.
 */
export function EmptyState({ onStart }: Props) {
  const reduced = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    drift.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [drift, reduced]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={driftStyle}>
        <View style={styles.glyph}>
          <Plus size={36} color={colors.textTertiary} strokeWidth={1.2} />
        </View>
      </Animated.View>
      <Text style={styles.title}>Nothing to count yet.</Text>
      <Text style={styles.subtitle}>
        Mark a moment. The clock will keep watch.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onStart}
        style={({ pressed }) => [
          styles.cta,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={styles.ctaText}>Start a hijr</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  glyph: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 32,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.body,
    fontFamily: "Fraunces_400Regular",
    fontSize: 22,
    color: colors.textPrimary,
    marginTop: 8,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
  },
  cta: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaText: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
});
