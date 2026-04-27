import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { DURATION } from "@/lib/motion";

export type ActionItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  items: ActionItem[];
};

/**
 * Bottom sheet with a fading backdrop and a sliding panel. We render via
 * conditional mount + Reanimated entering/exiting transitions for a smooth
 * coordinated reveal. The legacy Modal component is avoided so we can keep
 * the parent's animations intact.
 */
export function ActionSheet({ visible, onDismiss, title, items }: Props) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        entering={FadeIn.duration(DURATION.digit)}
        exiting={FadeOut.duration(DURATION.digit)}
        style={[StyleSheet.absoluteFill, styles.backdrop]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(DURATION.sheet)}
        exiting={SlideOutDown.duration(DURATION.base)}
        style={styles.sheet}
      >
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {items.map((item, i) => (
          <Pressable
            key={item.label}
            onPress={() => {
              item.onPress();
              onDismiss();
            }}
            style={({ pressed }) => [
              styles.item,
              i < items.length - 1 ? styles.itemDivider : null,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.itemText,
                item.destructive ? styles.destructive : null,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(42, 37, 32, 0.4)" },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 28,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    shadowColor: "#503C28",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  destructive: { color: "#B85C5C" },
});
