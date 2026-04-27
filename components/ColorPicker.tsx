import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { TIMER_PALETTE, type TimerColor } from "@/constants/palette";
import { DURATION, EASE_OUT } from "@/lib/motion";

type Props = {
  value: TimerColor;
  onChange: (next: TimerColor) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {TIMER_PALETTE.map((c) => (
        <ColorDot
          key={c.value}
          color={c.value}
          selected={c.value === value}
          onPress={() => onChange(c.value)}
        />
      ))}
    </View>
  );
}

function ColorDot({
  color,
  selected,
  onPress,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(selected ? 1.15 : 1);
  scale.value = withTiming(selected ? 1.15 : 1, {
    duration: DURATION.digit,
    easing: EASE_OUT,
  });

  const tickOpacity = useSharedValue(selected ? 1 : 0);
  tickOpacity.value = withTiming(selected ? 1 : 0, {
    duration: DURATION.digit,
    easing: EASE_OUT,
  });

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const tickStyle = useAnimatedStyle(() => ({ opacity: tickOpacity.value }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Color ${color}`}
    >
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]}>
        <Animated.View style={tickStyle}>
          <Check size={14} color="#FFFCF5" strokeWidth={2.4} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 4,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
