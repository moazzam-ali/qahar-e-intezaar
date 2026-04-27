import * as Haptics from "expo-haptics";

/**
 * Thin haptic helpers. Wrapped so we have a single place to disable them
 * (e.g. when the user has Reduce Motion / haptics off in their OS settings).
 */
export function hapticTap(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticPress(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticSoft(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
}

export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticWarning(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
