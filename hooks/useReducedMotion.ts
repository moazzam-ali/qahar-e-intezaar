import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Honors the OS "Reduce Motion" setting. When enabled, callers should collapse
 * animations to ~80ms instant cross-fades rather than removing them entirely.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v) => {
        if (mounted) setReduced(v);
      },
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
