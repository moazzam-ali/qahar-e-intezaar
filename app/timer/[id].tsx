import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Pause, Play, RefreshCw, Share2, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionSheet } from "@/components/ActionSheet";
import { ElapsedDisplay } from "@/components/ElapsedDisplay";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { hapticPress, hapticSoft, hapticWarning } from "@/hooks/useHaptic";
import { cancelMilestones } from "@/lib/notifications";
import {
  selectTimerById,
  useTimerStore,
} from "@/lib/store";
import {
  elapsedAt,
  formatClock,
  formatHuman,
  totalDays,
} from "@/lib/time";
import { DURATION } from "@/lib/motion";

export default function TimerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const timer = useTimerStore(selectTimerById(id ?? ""));
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const reset = useTimerStore((s) => s.reset);
  const archive = useTimerStore((s) => s.archive);

  const [resetSheet, setResetSheet] = useState(false);
  const [resetMessage, setResetMessage] = useState(false);

  // The hero ticks via Reanimated worklets (no re-render). The prose facts
  // below are rendered from JS state, so we keep a low-frequency 1Hz refresh
  // here just to keep "Total days" / clock honest while the screen is open.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const snapshot = useMemo(
    () => (timer ? elapsedAt(timer, Date.now()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timer?.id, timer?.startedAt, timer?.pausedAt, timer?.accumulatedPause, tick],
  );

  useEffect(() => {
    if (!resetMessage) return;
    const t = setTimeout(() => setResetMessage(false), 1200);
    return () => clearTimeout(t);
  }, [resetMessage]);

  if (!timer) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Timer not found.</Text>
      </SafeAreaView>
    );
  }

  const isPaused = timer.pausedAt !== null;

  const onShare = async () => {
    if (!snapshot) return;
    const days = totalDays(snapshot);
    await Share.share({
      message: `It's been ${days.toLocaleString()} days. — Qahar-e-Hijr`,
    });
  };

  const onConfirmReset = () => {
    reset(timer.id);
    void cancelMilestones(timer.id);
    hapticSoft();
    setResetSheet(false);
    setResetMessage(true);
  };

  const onArchive = () => {
    archive(timer.id);
    void cancelMilestones(timer.id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color={colors.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <Pressable
            onPress={onShare}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <Share2 size={20} color={colors.textSecondary} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: timer.color }]} />
          <Text style={styles.label} numberOfLines={2}>
            {timer.icon ? `${timer.icon}  ` : ""}
            {timer.label}
          </Text>
        </View>

        <View style={styles.hero}>
          <ElapsedDisplay timer={timer} variant="hero" />
        </View>

        {snapshot ? (
          <View style={styles.facts}>
            <Text style={styles.factHuman}>{formatHuman(snapshot)}</Text>
            <View style={styles.factRow}>
              <Text style={styles.factKey}>Total days</Text>
              <Text style={styles.factVal}>
                {totalDays(snapshot).toLocaleString()}
              </Text>
            </View>
            <View style={styles.factRow}>
              <Text style={styles.factKey}>Clock</Text>
              <Text style={styles.factVal}>{formatClock(snapshot)}</Text>
            </View>
            <View style={styles.factRow}>
              <Text style={styles.factKey}>Started</Text>
              <Text style={styles.factVal}>
                {format(new Date(timer.startedAt), "EEE, d MMM yyyy 'at' h:mm a")}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <ActionButton
            label={isPaused ? "Resume" : "Pause"}
            icon={
              isPaused ? (
                <Play size={18} color={colors.textPrimary} strokeWidth={1.5} />
              ) : (
                <Pause size={18} color={colors.textPrimary} strokeWidth={1.5} />
              )
            }
            onPress={() => {
              hapticPress();
              isPaused ? resume(timer.id) : pause(timer.id);
            }}
          />
          <ActionButton
            label="Reset"
            destructive
            icon={
              <RefreshCw size={18} color={colors.textPrimary} strokeWidth={1.5} />
            }
            onPress={() => {
              hapticWarning();
              setResetSheet(true);
            }}
          />
          <ActionButton
            label="Archive"
            destructive
            icon={
              <Trash2 size={18} color={colors.textPrimary} strokeWidth={1.5} />
            }
            onPress={onArchive}
          />
        </View>

        {resetMessage ? (
          <Animated.Text
            entering={FadeIn.duration(DURATION.base)}
            exiting={FadeOut.duration(DURATION.base)}
            style={styles.resetConfirm}
          >
            Reset.
          </Animated.Text>
        ) : null}
      </ScrollView>

      <ActionSheet
        visible={resetSheet}
        onDismiss={() => setResetSheet(false)}
        title="Reset this hijr to zero?"
        items={[
          { label: "Reset", destructive: true, onPress: onConfirmReset },
        ]}
      />
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  destructive,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text
        style={[
          styles.actionLabel,
          destructive ? { color: colors.textSecondary } : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
  },
  hero: {
    paddingTop: 28,
    paddingBottom: 32,
    minHeight: 96,
  },
  facts: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 20,
    gap: 14,
  },
  factHuman: {
    fontFamily: "Fraunces_400Regular",
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  factRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  factKey: {
    ...typography.caption,
    fontFamily: "Inter_500Medium",
    color: colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  factVal: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actions: {
    marginTop: 24,
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  actionLabel: {
    ...typography.caption,
    fontFamily: "Inter_500Medium",
    color: colors.textPrimary,
  },
  resetConfirm: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
  notFound: {
    ...typography.body,
    color: colors.textSecondary,
    padding: 20,
  },
});
