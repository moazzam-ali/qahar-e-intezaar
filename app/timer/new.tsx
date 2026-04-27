import { format } from "date-fns";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ColorPicker } from "@/components/ColorPicker";
import { colors } from "@/constants/colors";
import { DEFAULT_TIMER_COLOR, type TimerColor } from "@/constants/palette";
import { type as typography } from "@/constants/typography";
import { hapticSuccess } from "@/hooks/useHaptic";
import { scheduleMilestones } from "@/lib/notifications";
import { useTimerStore } from "@/lib/store";

export default function NewTimerScreen() {
  const router = useRouter();
  const create = useTimerStore((s) => s.create);

  const [label, setLabel] = useState("");
  const [color, setColor] = useState<TimerColor>(DEFAULT_TIMER_COLOR);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  const canSave = label.trim().length > 0;

  const onSave = () => {
    if (!canSave) return;
    const t = create({ label, color, startedAt });
    hapticSuccess();
    void scheduleMilestones(t);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={22} color={colors.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.title}>New hijr</Text>
          <Pressable
            disabled={!canSave}
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel="Save"
            hitSlop={8}
          >
            <Text
              style={[
                styles.saveText,
                !canSave && { color: colors.textTertiary },
              ]}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.label}>What are you counting since?</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. since I quit smoking"
            placeholderTextColor={colors.textTertiary}
            maxLength={60}
            style={styles.input}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
          <View style={styles.underline} />

          <Text style={[styles.label, styles.section]}>Color</Text>
          <ColorPicker value={color} onChange={setColor} />

          <Text style={[styles.label, styles.section]}>Started at</Text>
          <View style={styles.startRow}>
            <Text style={styles.startedAt}>
              {format(new Date(startedAt), "EEE, d MMM yyyy 'at' h:mm a")}
            </Text>
            <Pressable
              onPress={() => setStartedAt(Date.now())}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Now</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            For a date in the past, edit after creating — the back-date picker
            lives in the detail view.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  saveText: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  label: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
  },
  section: { marginTop: 28 },
  input: {
    ...typography.body,
    fontFamily: "Fraunces_400Regular",
    fontSize: 22,
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  underline: {
    height: 1,
    backgroundColor: colors.border,
  },
  startRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  startedAt: {
    ...typography.body,
    color: colors.textPrimary,
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 8,
  },
});
