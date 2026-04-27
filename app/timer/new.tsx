import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";

import { TimerForm, type TimerFormValues } from "@/components/TimerForm";
import { hapticSuccess } from "@/hooks/useHaptic";
import { scheduleMilestones } from "@/lib/notifications";
import { selectTimerById, useTimerStore } from "@/lib/store";

/**
 * One screen, two modes:
 *   - `/timer/new`        → create
 *   - `/timer/new?id=xyz` → edit existing timer xyz
 *
 * The edit mode reuses the same form so back-dating, color, and label edits
 * all land in one consistent place.
 */
export default function NewOrEditTimerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const create = useTimerStore((s) => s.create);
  const update = useTimerStore((s) => s.update);
  const existing = useTimerStore(
    useMemo(() => selectTimerById(id ?? ""), [id]),
  );

  const isEdit = Boolean(id) && Boolean(existing);

  const onSubmit = (values: TimerFormValues) => {
    if (isEdit && existing) {
      update(existing.id, {
        label: values.label,
        color: values.color,
        startedAt: values.startedAt,
      });
    } else {
      const t = create(values);
      void scheduleMilestones(t);
    }
    hapticSuccess();
    // Defer back() one frame so the haptic and modal-close animation don't
    // race the store update on slower devices.
    requestAnimationFrame(() => router.back());
  };

  return (
    <TimerForm
      initial={isEdit ? existing : undefined}
      onCancel={() => router.back()}
      onSubmit={onSubmit}
      title={isEdit ? "Edit hijr" : "New hijr"}
      submitLabel="Save"
    />
  );
}
