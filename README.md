# Qahar-e-Hijr

> *qa-har-e-hijr* — قہرِ ہجر — "the torment of separation"

A stopwatch for things that matter. Mark a moment, and the clock keeps watch — counting up indefinitely until you reset it.

The name pairs two Urdu words with literary weight: *qahar* (wrath, torment) and *hijr* (the classical poetic word for separation). This is the inverse of a countdown — a count-up since.

Tagline: **Time, since.**

## What it does

- Multiple concurrent count-up timers.
- Each timer stores a single source of truth — the start timestamp — so elapsed time is always recomputed and never drifts.
- Pause / resume / reset / archive.
- Per-timer color and optional emoji.
- Milestone notifications at 1d, 1w, 1mo, 100d, 1y.
- Home-screen widget (iOS + Android), live-ticking on iOS, minute-precision on Android.
- Fully offline. No accounts, no telemetry, no cloud sync.

## Tech stack

| Concern        | Choice                                                                  |
|----------------|-------------------------------------------------------------------------|
| Framework      | React Native via Expo (managed workflow), TypeScript strict             |
| Routing        | Expo Router (file-based)                                                |
| State          | Zustand                                                                 |
| Persistence    | AsyncStorage; App Group / SharedPreferences for the widget              |
| Animation      | `react-native-reanimated` v3 (UI-thread worklets), `moti` for entrances |
| Gestures       | `react-native-gesture-handler`                                          |
| Styling        | NativeWind (Tailwind for RN)                                            |
| Icons          | `lucide-react-native`                                                   |
| Type fonts     | Fraunces (display), Inter (UI) via `@expo-google-fonts`                 |
| Notifications  | `expo-notifications`                                                    |
| Haptics        | `expo-haptics`                                                          |
| iOS widget     | SwiftUI + WidgetKit, `Text(timerInterval:)` + `.contentTransition`      |
| Android widget | AppWidgetProvider + RemoteViews, 60s refresh, cross-fade redraw         |

## Prerequisites

- Node 20+, npm 10+ (or yarn / pnpm — only npm is documented).
- An Expo account (free) for EAS Build: https://expo.dev/signup
- For iOS: Xcode 15+, macOS, an Apple Developer account ($99/yr) to ship to TestFlight or the App Store. (Local simulator builds don't need it.)
- For Android: Android Studio with an SDK and emulator, or a USB-debug device.
- Optional but recommended: an EAS subscription if you exceed the free build minutes.

## Install

```bash
npm install
```

## Generating app icons / splash from source artwork

The repo doesn't ship pre-baked icon files — instead, drop your two source images into `assets/source/` and run a build script that derives every required size and safe-area variant from them.

```bash
# One time: install Pillow for the build script
pip3 install Pillow

# Drop your generated images into assets/source/ first
#   - assets/source/icon-cream.png        (icon on warm cream)
#   - assets/source/icon-transparent.png  (icon on transparency)

# Then build
python3 scripts/build-assets.py
```

This produces `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png`, and `assets/favicon.png` — all keyed off your two source images so re-runs after a logo iteration are a single command. See `assets/source/README.md` for details.



## Run (in-app development, no widget)

```bash
npx expo start
```

Press `i` for iOS simulator, `a` for Android. Use Expo Go on a physical device by scanning the QR.

> **Heads up:** widgets require a native build. They will **not** appear in Expo Go. You'll get the in-app experience just fine.

## Build (with widget) via EAS

The widget extensions are native — Swift on iOS, Kotlin on Android — so they require a real build, not Expo Go.

```bash
# Login once
npx eas login

# Configure (first time only)
npx eas build:configure

# iOS dev client (simulator-friendly)
npm run build:dev:ios

# Android dev client
npm run build:dev:android

# Production builds for both stores
npm run build:prod
```

After the build completes EAS sends you a link to install the app on a real device.

## Widget setup walkthrough

### Android — fully automatic

The Expo config plugin (`plugins/withQaharWidget.js`) wires up the AppWidget on prebuild. After `npx expo prebuild` and an EAS build, your widget will be available in the system widget picker as **Qahar-e-Hijr**.

### iOS — automatic except one Xcode step

1. Run `npx expo prebuild --clean`. This:
   - Adds the App Group entitlement.
   - Drops Swift/ObjC bridge files into `ios/QaharWidget/`.
2. Open `ios/qaharehijr.xcworkspace` in Xcode (one-time setup):
   - File → New → Target → **Widget Extension**. Name it `QaharWidget`. **Uncheck** "Include Configuration Intent" — the project ships its own.
   - Drag every file from `ios/QaharWidget/` into the new target. For the bridge files (`QaharWidgetBridge.swift`, `QaharWidgetBridge.m`) make sure target membership is **only the main app target**, not the widget. For the rest, the inverse.
   - Open the widget target → Signing & Capabilities → add **App Groups** → tick `group.com.qaharteam.qaharehijr`.
   - Repeat the App Groups capability on the **main app target**.
3. Build and run.

This is a one-time set-up. After this, all changes — JS, Swift, Kotlin — propagate via EAS or `expo prebuild` without touching Xcode again.

> Want to skip step 2? `@bacons/apple-targets` is a third-party config plugin that automates the widget target creation. We don't bundle it because it adds a dependency you may not want, but it slots in here cleanly.

## Build for the stores

```bash
# Build both
npm run build:prod

# Submit
npx eas submit --platform ios
npx eas submit --platform android
```

You'll need the Apple Developer / Google Play accounts mentioned above.

## Project layout

```
qahar-e-hijr/
├── app/                        Expo Router screens
│   ├── _layout.tsx             Root: fonts, hydration, splash, stack
│   ├── index.tsx               Home (list + FAB + long-press sheet)
│   ├── timer/new.tsx           Modal: create
│   ├── timer/[id].tsx          Detail: hero display + actions
│   └── settings.tsx            Widget pick + about
├── components/
│   ├── AnimatedDigit.tsx       Sliding-glyph primitive
│   ├── ElapsedDisplay.tsx      Composed digit groups, live ticking
│   ├── TimerCard.tsx           Home-list card, pressable
│   ├── FAB.tsx                 Breathing FAB
│   ├── EmptyState.tsx
│   ├── ColorPicker.tsx         Animated dot row
│   └── ActionSheet.tsx         Bottom sheet with backdrop
├── lib/
│   ├── store.ts                Zustand: timers + actions
│   ├── storage.ts              AsyncStorage wrapper
│   ├── shared-storage.ts       Native bridge for the App Group / SharedPrefs
│   ├── time.ts                 Elapsed math + formatters
│   ├── motion.ts               Easing / duration constants
│   └── notifications.ts
├── hooks/
│   ├── useNow.ts               1Hz Reanimated shared-value clock
│   ├── useHaptic.ts
│   └── useReducedMotion.ts     Honors OS Reduce Motion
├── constants/
│   ├── colors.ts               Warm palette + low-light variant
│   ├── palette.ts              Per-timer accent colors
│   └── typography.ts           Type scale
├── widgets/
│   ├── ios/                    SwiftUI WidgetKit extension + bridge
│   └── android/                AppWidgetProvider + bridge module + XML
├── plugins/
│   └── withQaharWidget.js      Config plugin
├── DESIGN.md                   Visual language + motion + asymmetry
└── types.ts
```

## Accessibility

- All interactive elements have `accessibilityLabel` and `accessibilityRole`.
- Layouts respect system text size up to ~150%.
- Honors **Reduce Motion** — animations collapse to ~80ms cross-fades, never a sudden jump.

## Known platform asymmetry

iOS widgets tick live (the OS does it for us via `Text(timerInterval:)`); Android widgets refresh once per minute (the OS minimum) and use a soft cross-fade on each refresh. This is documented in `DESIGN.md` and called out in-app on the settings screen.

## License

UNLICENSED — private project. Open an issue if you'd like a license.
