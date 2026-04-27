import { Easing } from "react-native-reanimated";

/**
 * The motion system. Restrained but constant; subtle but smooth; quick but
 * never rushed. Default ~280ms with an ease-out curve.
 */
export const DURATION = {
  /** Press-in acknowledgement; must feel instant. */
  instant: 120,
  /** Digit slide for the seconds counter. */
  digit: 200,
  /** Default UI transitions. */
  base: 280,
  /** Sheet slide-up, screen push. */
  sheet: 320,
  /** Reset confetti, full-line celebrations. */
  long: 480,
} as const;

/** Smooth ease-out — the meditative default. */
export const EASE_OUT = Easing.bezier(0.25, 0.1, 0.25, 1);

/** Slight ease-in-out for cross-fades that need symmetry. */
export const EASE_IN_OUT = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Spring configs. High damping, low stiffness — never bouncy.
 * Reanimated's withSpring takes these directly.
 */
export const SPRING = {
  settle: { damping: 22, stiffness: 180, mass: 1 },
  fab: { damping: 18, stiffness: 220, mass: 1 },
} as const;

/** Stagger between cards in a list mount. */
export const LIST_STAGGER_MS = 40;
