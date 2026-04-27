/**
 * The warm, light foundation. Off-whites and warm near-blacks; never pure.
 * Mirrored in tailwind.config.js so that Tailwind utilities and JS values agree.
 */
export const colors = {
  bg: "#FBF6EE",
  surface: "#FFFCF5",
  border: "#E8E0D2",
  textPrimary: "#2A2520",
  textSecondary: "#6B6358",
  textTertiary: "#A89F90",
  accent: "#B8826B",
} as const;

/** Low-light variant. Deep warm brown, never pure black. */
export const darkColors = {
  bg: "#1A1612",
  surface: "#221D17",
  border: "#332B22",
  textPrimary: "#E8E0D2",
  textSecondary: "#A89F90",
  textTertiary: "#6B6358",
  accent: "#B8826B",
} as const;

export type ThemeColors = typeof colors;
