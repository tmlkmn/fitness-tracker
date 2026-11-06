import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { colors } from "@/lib/theme";

export default function TodayStack() {
  const t = useTranslations("mobile.today");
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t("title") }} />
    </Stack>
  );
}
