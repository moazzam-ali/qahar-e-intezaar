import {
  Fraunces_300Light,
  Fraunces_400Regular,
  useFonts as useFraunces,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts as useInter,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { colors } from "@/constants/colors";
import { setupNotifications } from "@/lib/notifications";
import { useTimerStore } from "@/lib/store";
import { DURATION } from "@/lib/motion";

import "@/global.css";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useTimerStore((s) => s.hydrated);
  const hydrate = useTimerStore((s) => s.hydrate);

  const [frauncesLoaded] = useFraunces({
    Fraunces_300Light,
    Fraunces_400Regular,
  });
  const [interLoaded] = useInter({ Inter_400Regular, Inter_500Medium });

  useEffect(() => {
    void hydrate();
    void setupNotifications();
  }, [hydrate]);

  useEffect(() => {
    if (frauncesLoaded && interLoaded && hydrated) {
      void SplashScreen.hideAsync();
    }
  }, [frauncesLoaded, interLoaded, hydrated]);

  if (!frauncesLoaded || !interLoaded || !hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: "slide_from_right",
              animationDuration: DURATION.sheet,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen
              name="timer/new"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen name="timer/[id]" />
            <Stack.Screen
              name="settings"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
