import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { Timer } from "@/types";

const MILESTONES_MS = [
  24 * 60 * 60 * 1000, // 1 day
  7 * 24 * 60 * 60 * 1000, // 1 week
  30 * 24 * 60 * 60 * 1000, // 1 month
  100 * 24 * 60 * 60 * 1000, // 100 days
  365 * 24 * 60 * 60 * 1000, // 1 year
];

const MILESTONE_LABELS = ["1 day", "1 week", "1 month", "100 days", "1 year"];
const ANDROID_CHANNEL_ID = "milestones";

let setupDone = false;

/**
 * Idempotent one-time setup. Called by `scheduleMilestones`; safe to call from
 * elsewhere (e.g. the root layout) too.
 *
 * - Configures foreground notification handling so milestone alerts surface
 *   while the app is in front rather than being silently swallowed.
 * - Creates the Android notification channel (required on API 26+).
 */
export async function setupNotifications(): Promise<void> {
  if (setupDone) return;
  setupDone = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "Milestones",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: undefined,
        vibrationPattern: [0, 200],
        lightColor: "#B8826B",
      });
    } catch (err) {
      console.warn("[notifications] channel setup failed", err);
    }
  }
}

/**
 * Request permissions and schedule milestone notifications for a timer. Each
 * milestone is a separate scheduled notification fired N ms after startedAt.
 *
 * Best-effort. If permission is denied or scheduling fails we just log.
 */
export async function scheduleMilestones(timer: Timer): Promise<void> {
  try {
    await setupNotifications();

    const settings = await Notifications.getPermissionsAsync();
    if (settings.status !== "granted" && !settings.canAskAgain) return;
    if (settings.status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return;
    }

    const now = Date.now();
    for (let i = 0; i < MILESTONES_MS.length; i++) {
      const offset = MILESTONES_MS[i];
      const label = MILESTONE_LABELS[i];
      if (offset === undefined || label === undefined) continue;
      const fireAt = timer.startedAt + offset;
      if (fireAt <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${timer.id}-${label}`,
        content: {
          title: timer.label,
          body: `${label} since.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
          channelId: Platform.OS === "android" ? ANDROID_CHANNEL_ID : undefined,
        },
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
