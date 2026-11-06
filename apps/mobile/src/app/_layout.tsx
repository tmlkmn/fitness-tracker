import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

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
            <Stack.Screen name="progress-log" options={{ title: "", presentation: "modal" }} />
            <Stack.Screen name="sleep/[date]" options={{ title: "", presentation: "modal" }} />
          </Stack.Protected>
          <Stack.Protected guard={!!user && !!blocked}>
            <Stack.Screen name="blocked" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </I18nProvider>
  );
}
