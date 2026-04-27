/**
 * Typographic scale. Fraunces for time numerals (with tabular-nums so digit
 * slots don't shift width). Inter for chrome.
 */
export const type = {
  hero: {
    fontFamily: "Fraunces_300Light",
    fontSize: 56,
    letterSpacing: -1.12,
    lineHeight: 64,
  },
  cardElapsed: {
    fontFamily: "Fraunces_400Regular",
    fontSize: 28,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  sectionHeader: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.78,
    textTransform: "uppercase" as const,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 22,
  },
  caption: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
} as const;

/** Tabular figures keep digit slots aligned during the slide animation. */
export const tabular = { fontVariant: ["tabular-nums"] as const };
