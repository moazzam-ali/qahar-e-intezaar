# Qahar-e-Hijr — Design System

A warm, contemplative count-up timer. The visual identity has two distinct surfaces — the in-app experience and the home-screen widget — sharing a foundation of warm cream, near-black ink, and a single dusty terracotta accent.

## 1. Voice & character

Restrained, but alive. The app should feel like a small piece of paper resting on a wooden desk, with the seconds quietly turning. Never busy. Never abrupt.

Three guiding rules:

1. **Nothing snaps.** Every state change interpolates.
2. **Quick but soft.** 240–320ms with ease-out is the sweet spot.
3. **No saturation.** No primary blues, no ad-tech orange. Every color is dusty.

## 2. Color

### Foundation

| Role             | Hex       | Use                                              |
|------------------|-----------|--------------------------------------------------|
| Background       | `#FBF6EE` | App canvas, scroll surface                       |
| Surface          | `#FFFCF5` | Cards, sheets, inputs                            |
| Border / divider | `#E8E0D2` | 1px lines, card edges                            |
| Ink primary      | `#2A2520` | Body text, hero numerals                         |
| Ink secondary    | `#6B6358` | Labels, captions                                 |
| Ink tertiary     | `#A89F90` | Disabled, hints, placeholders                    |
| Accent           | `#B8826B` | Active state, FAB, save, focus underline         |

Pure white and pure black are forbidden in chrome. Shadows are warm: `rgba(80, 60, 40, 0.06)` on a 24px blur.

### Per-timer accent palette

Curated, deliberately desaturated. Used only as 6–10px dots, never as full backgrounds.

`#C68B8B` rose · `#C9A062` ochre · `#8FA48B` sage · `#7A8AAB` indigo · `#B8826B` terracotta · `#7E8590` slate · `#9B7A8E` plum · `#8B9474` moss

### Low-light (dark) variant

A deliberate "evening" mode, not pure dark mode. Deep warm brown base; cream text.

| Role        | Hex       |
|-------------|-----------|
| Background  | `#1A1612` |
| Surface     | `#221D17` |
| Border      | `#332B22` |
| Ink primary | `#E8E0D2` |
| Accent      | `#B8826B` |

The light↔dark transition itself animates (320ms) — the surface re-tints rather than flashing.

## 3. Typography

| Style          | Family               | Weight | Size | Tracking  | Use                              |
|----------------|----------------------|--------|------|-----------|----------------------------------|
| Hero elapsed   | Fraunces             | 300    | 56   | -0.02em   | Detail-view count-up display     |
| Card elapsed   | Fraunces             | 400    | 28   | -0.01em   | Home-list cards                  |
| Section header | Inter                | 500    | 13   |  0.06em   | UPPERCASE eyebrows               |
| Body           | Inter                | 400    | 16   |  0       | Labels, copy                     |
| Body Medium    | Inter                | 500    | 16   |  0       | Action buttons, save             |
| Caption        | Inter                | 400    | 13   |  0       | Started-at lines, hints          |

All numerals use `tabular-nums` so digit slots have stable widths — essential so the digit-slide animation is purely vertical.

## 4. Spacing & rhythm

Use a **8 / 12 / 16 / 20 / 24 / 32 / 48** scale. Cards: 20px padding, 16–20px corner radius, 12px gap between cards. Generous whitespace; no decoration that doesn't carry information.

## 5. Motion

Motion is a first-class concern. The brief: alive without being busy.

### Tokens

| Token            | ms   | Use                                 |
|------------------|------|-------------------------------------|
| `instant`        | 120  | Press-in scale, opacity dip         |
| `digit`          | 200  | Single-digit slide                  |
| `base`           | 280  | Default — cards, fades, transitions |
| `sheet`          | 320  | Modal / push                        |
| `long`           | 480  | Reset cascade, list collapse        |

Default ease is `cubic-bezier(0.25, 0.1, 0.25, 1)` (smooth ease-out). Springs only for the FAB release: `damping: 18, stiffness: 220`. Never bouncy.

### The ticking digit

The most important animation. When a digit changes:

- The outgoing glyph slides up `~45%` of its slot height while fading to 0.
- The incoming glyph slides up from `+45%` while fading to 1.
- 200ms total, ease-out, on the UI thread via Reanimated worklets.

Implementation: `<AnimatedDigit value="3" />` is reusable — used for hero, cards, anywhere a single ticking glyph is needed. Punctuation passes through unanimated.

When a *unit* rolls (e.g. `59m → 1h`), the unit label cross-fades over 280ms using Reanimated `FadeIn` / `FadeOut`. Whole composition reflows smoothly.

### Cards

- **Mount:** opacity 0→1, translateY 8→0, 280ms, 40ms stagger between siblings.
- **Press in:** scale 0.98, opacity 0.92, 120ms.
- **Press out:** restore, 180ms.
- **Long-press:** 280ms hold + Medium haptic + sheet.
- **Reorder / archive:** Reanimated `LinearTransition` over 280ms.

### FAB

Constant breathing — `scale 1.0 ↔ 1.02` over a 4s sine. Press dips to 0.92, release springs. Disable when Reduce Motion is on.

### Screens

- **Push:** slide-from-right 320ms with a 12px lead.
- **Pop:** mirror but 280ms (the perceived-snappiness trick).
- **Modals:** slide-up 320ms with backdrop fade to 0.4 in 200ms.

### Reduce Motion

When the OS setting is on:
- Digit slides collapse to 80ms cross-fades — no translation.
- FAB stops breathing.
- Stagger collapses to zero.
- Press feedback stays (it's immediate UI, not motion-decorative).

## 6. Components

| Component        | Notes                                                                        |
|------------------|------------------------------------------------------------------------------|
| `AnimatedDigit`  | One slot. Reanimated worklet. Reused across hero / card / widget previews.   |
| `ElapsedDisplay` | Composes digits + units with the magnitude-aware format.                     |
| `TimerCard`      | Pressable with worklet press-state. Long-press triggers an action sheet.     |
| `FAB`            | Breathing accent button.                                                     |
| `ColorPicker`    | Eight dots; selected one scales 1.15 with a tick.                            |
| `ActionSheet`    | Sheet with backdrop fade + slide-up.                                         |
| `EmptyState`     | Slow vertical drift on the "+", quiet copy.                                  |

## 7. Widget

Two surfaces, one identity. The widget is **glass on warm cream**, while the app is solid warm cream. Both use the same accent and the same typeface.

### iOS (WidgetKit + SwiftUI)

- Background: `Color("#FBF6EE")` at 72% opacity over `.systemThinMaterialLight`.
- A 1px highlight via the system widget chrome — no custom border needed.
- Live counting via SwiftUI's `Text(timerInterval:)`. The OS handles ticking — no battery hit.
- Smooth digit changes via `.contentTransition(.numericText())` on the elapsed text.
- Configurable timer pick via `AppIntent` (or, falling back, the app-side selection in shared `UserDefaults`).
- Sizes: small (label + elapsed) and medium (label + elapsed + started-at line). Large is deferred.

### Android (AppWidgetProvider + RemoteViews)

- Same warm-cream `~72%` translucent panel via a `<shape>` drawable with a faint top-edge highlight.
- 24dp corner radius; matches modern Android widget chrome.
- Refresh is **once per minute** — Android's OS-mandated minimum for `updatePeriodMillis`. Sub-minute resolution is impossible; we display minute-precision and call this out in Settings.
- Each refresh cross-fades via `setBackgroundResource` — soft enough that the user doesn't see a flash.
- Sizes: small (2×2) and medium (4×2), both resizable.

### iOS / Android asymmetry — explicitly accepted

| Aspect      | iOS                          | Android                                 |
|-------------|------------------------------|-----------------------------------------|
| Tick rate   | Live (OS-driven)             | 60s minimum (OS-mandated)               |
| Animation   | `.contentTransition` digit-flip | Cross-fade on each refresh               |
| Config UI   | `AppIntent` + Settings       | Settings screen (no widget config UI)   |
| Format      | "1d 2h 3m 47s" live          | "1d 2h 3m" updated each minute          |

This is real and unavoidable. We document it; we don't fight it.

## 8. Data flow

```
TimerCard / Detail   ─┐
                     ├──> Zustand  ──> AsyncStorage   (in-app persistence)
new / edit / pause   ─┘             ──> Native bridge ──> App Group / SharedPrefs
                                                        └─> Widget reads on refresh
```

A single 1Hz interval lives at the app level, exposed as a Reanimated `SharedValue<number>` via `useNow()`. ElapsedDisplay subscribes via `useDerivedValue` and only triggers React state updates when the formatted segment string actually changes. So the seconds digit re-renders, but the years digit doesn't until rollover.

## 9. Quality bar

- 60fps minimum on a Pixel 5a; 120fps on ProMotion iPhones.
- Cold start to first paint < 700ms after fonts load.
- No dropped frames during list scroll while timers tick.
- Timer accuracy preserved across app kill / restart — verified by recomputing from `startedAt` on every render rather than caching elapsed.
- Widget displays correct time within 60 seconds of the app's value.
