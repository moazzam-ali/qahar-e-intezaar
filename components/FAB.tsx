import { Plus } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { hapticTap } from "@/hooks/useHaptic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DURATION, EASE_OUT, SPRING } from "@/lib/motion";

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
};

/**
 * Floating action button. At rest it breathes — scale oscillates between 1.0
 * and 1.02 over a 4-second sine cycle. Almost imperceptible, but adds life.
 */
export function FAB({ onPress, accessibilityLabel = "Start a hijr" }: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scale);
  }, [reduced, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    cancelAnimation(scale);
    scale.value = withTiming(0.92, { duration: 140, easing: EASE_OUT });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, SPRING.fab);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.shadowWrap, animated]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => {
            hapticTap();
            onPress();
          }}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={({ pressed }) => [
            styles.fab,
            { opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Plus size={28} color="#FFFCF5" strokeWidth={1.6} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    bottom: 28,
  },
  shadowWrap: {
    // Soft warm shadow — only used on the FAB and modals.
    shadowColor: "#503C28",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderRadius: 32,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
