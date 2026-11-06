import { NativeTabs } from "expo-router/native-tabs";
import { useTranslations } from "use-intl";

import { usePushRegistration } from "@/hooks/push";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const t = useTranslations("mobile");
  const tc = useTranslations("calendar");
  const tp = useTranslations("progress");
  usePushRegistration();

  return (
    <NativeTabs tintColor={colors.primary} backgroundColor={colors.background} iconColor={{ default: colors.textMuted, selected: colors.primary }}>
      <NativeTabs.Trigger name="(today)">
        <NativeTabs.Trigger.Label>{t("today.title")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "sun.max", selected: "sun.max.fill" }} md="today" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>{tc("title")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "calendar", selected: "calendar" }} md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>{tp("title")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "chart.line.uptrend.xyaxis", selected: "chart.line.uptrend.xyaxis" }} md="trending_up" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t("settings.title")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
