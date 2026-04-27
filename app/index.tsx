import { Settings as SettingsIcon } from "lucide-react-native";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useShallow } from "zustand/react/shallow";

import { ActionSheet } from "@/components/ActionSheet";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { TimerCard } from "@/components/TimerCard";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { hapticTap } from "@/hooks/useHaptic";
import { selectActiveTimers, useTimerStore } from "@/lib/store";
import { DURATION, LIST_STAGGER_MS } from "@/lib/motion";
import type { Timer } from "@/types";

export default function HomeScreen() {
  const router = useRouter();
  const timers = useTimerStore(useShallow(selectActiveTimers));
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const reset = useTimerStore((s) => s.reset);
  const archive = useTimerStore((s) => s.archive);

  const [longPressed, setLongPressed] = useState<Timer | null>(null);

  const onLongPress = useCallback((t: Timer) => setLongPressed(t), []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Qahar-e-Hijr</Text>
          <Text style={styles.title}>How long has it been?</Text>
        </View>
        <Pressable
          onPress={() => {
            hapticTap();
            router.push("/settings");
          }}
          accessibilityLabel="Settings"
          accessibilityRole="button"
          hitSlop={12}
          style={({ pressed }) => [
            styles.settingsBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <SettingsIcon
            size={20}
            color={colors.textSecondary}
            strokeWidth={1.5}
          />
        </Pressable>
      </View>

      {timers.length === 0 ? (
        <EmptyState onStart={() => router.push("/timer/new")} />
      ) : (
        <FlatList
          data={timers}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeIn.delay(index * LIST_STAGGER_MS).duration(
                DURATION.base,
              )}
              layout={LinearTransition.duration(DURATION.base)}
            >
              <TimerCard timer={item} onLongPress={onLongPress} />
            </Animated.View>
          )}
        />
      )}

      <FAB onPress={() => router.push("/timer/new")} />

      <ActionSheet
        visible={longPressed !== null}
        onDismiss={() => setLongPressed(null)}
        title={longPressed?.label}
        items={
          longPressed
            ? [
                longPressed.pausedAt !== null
                  ? {
                      label: "Resume",
                      onPress: () => resume(longPressed.id),
                    }
                  : { label: "Pause", onPress: () => pause(longPressed.id) },
                {
                  label: "Edit",
                  onPress: () =>
                    router.push(`/timer/${longPressed.id}?edit=1`),
                },
                {
                  label: "Reset",
                  onPress: () => reset(longPressed.id),
                  destructive: true,
                },
                {
                  label: "Archive",
                  onPress: () => archive(longPressed.id),
                  destructive: true,
                },
              ]
            : []
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  eyebrow: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
  },
  title: {
    fontFamily: "Fraunces_400Regular",
    fontSize: 26,
    color: colors.textPrimary,
    marginTop: 4,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
});
