import { useRouter } from "expo-router";
import { Check, X } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";

import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { selectActiveTimers, useTimerStore } from "@/lib/store";

export default function SettingsScreen() {
  const router = useRouter();
  const timers = useTimerStore(useShallow(selectActiveTimers));
  const widgetTimerId = useTimerStore((s) => s.widgetTimerId);
  const setWidgetTimerId = useTimerStore((s) => s.setWidgetTimerId);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Settings</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={22} color={colors.textSecondary} strokeWidth={1.5} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Widget</Text>
        <Text style={styles.helpText}>
          Pick which timer your home-screen widget displays. The widget reads
          this on each refresh; updates may take up to a minute on Android.
        </Text>

        <View style={styles.list}>
          {timers.length === 0 ? (
            <Text style={styles.empty}>
              You haven&apos;t started any timers yet.
            </Text>
          ) : (
            timers.map((t) => {
              const selected = t.id === widgetTimerId;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setWidgetTimerId(t.id)}
                  style={({ pressed }) => [
                    styles.row,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                  accessibilityRole="button"
                >
                  <View
                    style={[styles.dot, { backgroundColor: t.color }]}
                  />
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {t.label}
                  </Text>
                  {selected ? (
                    <Check
                      size={18}
                      color={colors.accent}
                      strokeWidth={1.8}
                    />
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>

        <Text style={[styles.sectionLabel, styles.section]}>About</Text>
        <Text style={styles.helpText}>
          Qahar-e-Hijr — قہرِ ہجر — &quot;the torment of separation.&quot; A
          stopwatch for things that matter.
        </Text>
      </ScrollView>
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
  title: {
    fontFamily: "Fraunces_400Regular",
    fontSize: 22,
    color: colors.textPrimary,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  sectionLabel: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
  },
  section: { marginTop: 28 },
  helpText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  list: { marginTop: 16, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
});
