import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format } from "date-fns";
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
import type { Timer } from "@/types";

export type TimerFormValues = {
  label: string;
  color: TimerColor;
  startedAt: number;
};

type Props = {
  /** Pre-fill values for edit mode. Absent = create mode. */
  initial?: Timer;
  onCancel: () => void;
  onSubmit: (values: TimerFormValues) => void;
  /** "New hijr" / "Edit hijr" — copy varies by mode. */
  title: string;
  submitLabel: string;
};

/**
 * Shared form used by `/timer/new` (create) and `/timer/new?id=...` (edit).
 *
 * Validation: label required (1–60 chars after trim); startedAt cannot be in
 * the future (we clamp to "now" if a user picks a future time).
 */
export function TimerForm({
  initial,
  onCancel,
  onSubmit,
  title,
  submitLabel,
}: Props) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [color, setColor] = useState<TimerColor>(
    (initial?.color as TimerColor) ?? DEFAULT_TIMER_COLOR,
  );
  const [startedAt, setStartedAt] = useState<number>(
    initial?.startedAt ?? Date.now(),
  );
  const [pickerOpen, setPickerOpen] = useState<"date" | "time" | null>(null);

  const canSave = label.trim().length > 0;

  const handleSubmit = () => {
    if (!canSave) return;
    const safeStart = Math.min(startedAt, Date.now());
    onSubmit({ label: label.trim(), color, startedAt: safeStart });
  };

  const onDateChange = (
    _: DateTimePickerEvent,
    chosen: Date | undefined,
  ) => {
    if (Platform.OS !== "ios") setPickerOpen(null);
    if (!chosen) return;
    const next = new Date(startedAt);
    if (pickerOpen === "date") {
      next.setFullYear(chosen.getFullYear(), chosen.getMonth(), chosen.getDate());
    } else if (pickerOpen === "time") {
      next.setHours(chosen.getHours(), chosen.getMinutes(), 0, 0);
    }
    setStartedAt(Math.min(next.getTime(), Date.now()));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={onCancel}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={22} color={colors.textSecondary} strokeWidth={1.5} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            disabled={!canSave}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            hitSlop={8}
          >
            <Text
              style={[
                styles.saveText,
                !canSave && { color: colors.textTertiary },
              ]}
            >
              {submitLabel}
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
            autoFocus={!initial}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <View style={styles.underline} />

          <Text style={[styles.label, styles.section]}>Color</Text>
          <ColorPicker value={color} onChange={setColor} />

          <Text style={[styles.label, styles.section]}>Started at</Text>
          <Text style={styles.startedAt}>
            {format(new Date(startedAt), "EEE, d MMM yyyy 'at' h:mm a")}
          </Text>
          <View style={styles.startActions}>
            <Pressable
              onPress={() => setPickerOpen("date")}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Change date</Text>
            </Pressable>
            <Pressable
              onPress={() => setPickerOpen("time")}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Change time</Text>
            </Pressable>
            <Pressable
              onPress={() => setStartedAt(Date.now())}
              hitSlop={6}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Now</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Future times are clamped to now — you can&apos;t count down here.
          </Text>

          {pickerOpen ? (
            <DateTimePicker
              value={new Date(startedAt)}
              mode={pickerOpen}
              maximumDate={new Date()}
              onChange={onDateChange}
              display={Platform.OS === "ios" ? "inline" : "default"}
            />
          ) : null}
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
  startedAt: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: 8,
  },
  startActions: {
    flexDirection: "row",
    gap: 18,
    marginTop: 10,
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 12,
  },
});
