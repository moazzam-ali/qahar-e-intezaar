import * as Notifications from "expo-notifications";

import type { Timer } from "@/types";

const MILESTONES_MS = [
  24 * 60 * 60 * 1000, // 1 day
  7 * 24 * 60 * 60 * 1000, // 1 week
  30 * 24 * 60 * 60 * 1000, // 1 month
  100 * 24 * 60 * 60 * 1000, // 100 days
  365 * 24 * 60 * 60 * 1000, // 1 year
];

const MILESTONE_LABELS = ["1 day", "1 week", "1 month", "100 days", "1 year"];

/**
 * Request permissions and schedule milestone notifications for a timer. Each
 * milestone is a separate scheduled notification fired N ms after startedAt.
 *
 * Best-effort. If permission is denied or scheduling fails we just log.
 */
export async function scheduleMilestones(timer: Timer): Promise<void> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (
      settings.status !== "granted" &&
      !settings.canAskAgain
    ) {
      return;
    }
    if (settings.status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return;
    }

    const now = Date.now();
    for (let i = 0; i < MILESTONES_MS.length; i++) {
      const fireAt = timer.startedAt + MILESTONES_MS[i]!;
      if (fireAt <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${timer.id}-${MILESTONE_LABELS[i]}`,
        content: {
          title: timer.label,
          body: `${MILESTONE_LABELS[i]} since.`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
      });
    }
  } catch (err) {
    console.warn("[notifications] schedule failed", err);
  }
}

export async function cancelMilestones(timerId: string): Promise<void> {
  try {
    for (const label of MILESTONE_LABELS) {
      await Notifications.cancelScheduledNotificationAsync(
        `${timerId}-${label}`,
      );
    }
  } catch (err) {
    console.warn("[notifications] cancel failed", err);
  }
}
