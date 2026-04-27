/**
 * Per-timer accent palette. All entries are deliberately desaturated — these
 * appear only as small color dots, never as full backgrounds.
 */
export const TIMER_PALETTE = [
  { name: "Dusty Rose", value: "#C68B8B" },
  { name: "Ochre", value: "#C9A062" },
  { name: "Sage", value: "#8FA48B" },
  { name: "Indigo", value: "#7A8AAB" },
  { name: "Terracotta", value: "#B8826B" },
  { name: "Slate", value: "#7E8590" },
  { name: "Plum", value: "#9B7A8E" },
  { name: "Moss", value: "#8B9474" },
] as const;

export type TimerColor = (typeof TIMER_PALETTE)[number]["value"];

export const DEFAULT_TIMER_COLOR: TimerColor = "#B8826B";
