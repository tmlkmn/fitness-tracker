import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";

import { useAddWater, useSleep, useWater } from "@/hooks/wellness";
import { todayStr } from "@/lib/dates";
import { colors, radius, seriesColors, spacing } from "@/lib/theme";

import { AppText, Card, ProgressBar } from "./ui";

export function RoundButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: "add" | "remove";
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.round, pressed && { backgroundColor: colors.cardPressed }, disabled && { opacity: 0.4 }]}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

export function WaterCard({ date, readOnly = false }: { date: string; readOnly?: boolean }) {
  const t = useTranslations("mobile.today");
  const water = useWater(date);
  const add = useAddWater(date);
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.grow}>
          <AppText variant="heading">💧 {t("water")}</AppText>
          <AppText variant="muted">{t("waterGlasses", { count: water.glasses, target: water.target })}</AppText>
        </View>
        {readOnly ? null : (
          <>
            <RoundButton icon="remove" label={t("removeGlass")} disabled={water.glasses === 0} onPress={() => add.mutate(-1)} />
            <RoundButton icon="add" label={t("addGlass")} onPress={() => add.mutate(1)} />
          </>
        )}
      </View>
      <ProgressBar value={water.glasses} max={water.target} color={seriesColors.water} />
    </Card>
  );
}

export function useSleepDuration() {
  const t = useTranslations("mobile.sleep");
  return (minutes: number) => t("duration", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

export function QualityMoons({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.moons} accessible accessibilityLabel={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((v) => (
        <Ionicons key={v} name={v <= value ? "moon" : "moon-outline"} size={size} color={v <= value ? seriesColors.sleep : colors.border} />
      ))}
    </View>
  );
}

/** The night logged for `date`; opens the sleep form unless read-only. */
export function SleepCard({ date, readOnly = false }: { date: string; readOnly?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const sleep = useSleep(date);
  const duration = useSleepDuration();
  const log = sleep.data;

  const body = (
    <View style={styles.row}>
      <View style={styles.grow}>
        <AppText variant="heading">🌙 {t("mobile.today.sleep")}</AppText>
        {log ? (
          <>
            <AppText variant="muted">
              {log.durationMinutes != null ? duration(log.durationMinutes) : "—"} · {log.bedtime}–{log.wakeTime}
            </AppText>
            {log.quality ? <QualityMoons value={log.quality} /> : null}
          </>
        ) : (
          <AppText variant="muted">
            {readOnly ? t("sleep.noEntry") : date === todayStr() ? t("sleep.addToday") : t("sleep.addButton")}
          </AppText>
        )}
      </View>
      {readOnly ? null : <Ionicons name={log ? "create-outline" : "add-circle-outline"} size={24} color={colors.textMuted} />}
    </View>
  );

  if (readOnly || sleep.isLoading) return <Card>{body}</Card>;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/sleep/${date}`)}>
      {({ pressed }) => <Card style={pressed && { backgroundColor: colors.cardPressed }}>{body}</Card>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  moons: { flexDirection: "row", gap: 2, marginTop: 2 },
  round: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
