import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { modalScreenOptions } from "@/components/modal-header";
import { I18nProvider } from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import { SessionProvider, useSession } from "@/lib/session";
import { colors, navigationTheme } from "@/lib/theme";

// Kept up until the stored session has been read (see AppStack).
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AppStack />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function AppStack() {
  const { user, isLoading, blocked, locale } = useSession();

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <I18nProvider locale={locale}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerBackButtonDisplayMode: "minimal",
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Protected guard={!!user && !blocked}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="day/[dayId]" options={{ title: "" }} />
            <Stack.Screen name="shopping" options={{ title: "" }} />
            <Stack.Screen name="progress-log" options={modalScreenOptions} />
            <Stack.Screen name="sleep/[date]" options={modalScreenOptions} />
            <Stack.Screen name="meal-form" options={modalScreenOptions} />
            <Stack.Screen name="exercise-form" options={modalScreenOptions} />
            <Stack.Screen name="ai/meal-variation" options={modalScreenOptions} />
            <Stack.Screen name="ai/exercise" options={modalScreenOptions} />
            <Stack.Screen name="ai/day-meals" options={modalScreenOptions} />
            <Stack.Screen name="ai/workout" options={modalScreenOptions} />
            <Stack.Screen name="ai/weekly" options={modalScreenOptions} />
            <Stack.Screen name="ai/job/[jobId]" options={modalScreenOptions} />
            <Stack.Screen name="ai/report" options={modalScreenOptions} />
            <Stack.Screen name="weight-targets" options={modalScreenOptions} />
            <Stack.Screen name="profile" options={modalScreenOptions} />
            <Stack.Screen name="routine" options={modalScreenOptions} />
            <Stack.Screen name="macro-targets" options={{ title: "" }} />
            <Stack.Screen name="notifications" options={{ title: "" }} />
            <Stack.Screen name="notification-settings" options={{ title: "" }} />
            <Stack.Screen name="reminders" options={{ title: "" }} />
            <Stack.Screen name="reminder-form" options={modalScreenOptions} />
            <Stack.Screen name="sharing" options={{ title: "" }} />
            <Stack.Screen name="share-week" options={modalScreenOptions} />
            <Stack.Screen name="shared/week/[weeklyPlanId]" options={{ title: "" }} />
            <Stack.Screen name="shared/day/[dayId]" options={{ title: "" }} />
          </Stack.Protected>
          <Stack.Protected guard={!!user && !!blocked}>
            <Stack.Screen name="blocked" options={{ headerShown: false }} />
          </Stack.Protected>
          {/* Account deletion must always work — also from the blocked and consent screens. */}
          <Stack.Protected guard={!!user}>
            <Stack.Screen name="delete-account" options={{ title: "" }} />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </I18nProvider>
  );
}
