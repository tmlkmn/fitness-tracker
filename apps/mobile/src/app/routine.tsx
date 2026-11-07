import Ionicons from "@expo/vector-icons/Ionicons";
import type { UserProfileDto } from "@fitmusc/shared/api/dto";
import { isRepeatableEvent, normalizeEvent, ROUTINE_EVENTS } from "@fitmusc/shared/routine-constants";
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { ErrorBox } from "@/components/ai";
import { TimeField } from "@/components/form";
import { AppText, Button, Card, ErrorView, LoadingView, Segmented, useErrorMessage } from "@/components/ui";
import { IconCircle } from "@/components/visual";
import { useCloseGuard } from "@/hooks/close-guard";
import { useProfile, useSaveRoutine } from "@/hooks/wellness";
import { colors, radius, spacing, withAlpha } from "@/lib/theme";

type Item = { time: string; event: string };
type Kind = "weekday" | "weekend";
type EventValue = (typeof ROUTINE_EVENTS)[number]["value"];

// Same icons and starter routine as the web editor (apps/web/src/components/settings/daily-routine-editor.tsx).
const EVENT_ICONS: Record<EventValue, string> = {
  Uyanış: "🌅",
  Kahvaltı: "🍳",
  "İşe Gidiş": "🚗",
  "Öğle Yemeği": "🥗",
  "Ara Öğün": "🍎",
  "İşten Çıkış": "🏠",
  "Akşam Yemeği": "🍽️",
  Antrenman: "🏋️",
  Uyku: "😴",
};

const TEMPLATE: Item[] = [
  { time: "07:00", event: "Uyanış" },
  { time: "08:00", event: "Kahvaltı" },
  { time: "12:30", event: "Öğle Yemeği" },
  { time: "17:00", event: "Antrenman" },
  { time: "19:00", event: "Akşam Yemeği" },
  { time: "23:00", event: "Uyku" },
];

/** The server's limit per routine (routineSchema). */
const MAX_ITEMS = 30;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const isEvent = (value: string): value is EventValue => ROUTINE_EVENTS.some((e) => e.value === value);

function parseRoutine(value: unknown): Item[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw: unknown) => {
    const item = raw as Partial<Item> | null;
    if (typeof item?.time !== "string" || typeof item.event !== "string" || !TIME.test(item.time)) return [];
    return [{ time: item.time, event: normalizeEvent(item.event) }];
  });
}

/** An hour after the last row (the picker needs a valid time), 07:00 for the first one. */
function nextTime(items: Item[]) {
  const last = items.at(-1)?.time;
  if (!last) return "07:00";
  const hour = Math.min(Number(last.slice(0, 2)) + 1, 23);
  return `${String(hour).padStart(2, "0")}:${last.slice(3)}`;
}

/** Rows without an event are dropped, the rest sorted by time — as the web saves them. */
const clean = (items: Item[]) => items.filter((i) => i.event).sort((a, b) => a.time.localeCompare(b.time));

/** Weekday and weekend routine (web: Settings → Daily routine). */
export default function RoutineScreen() {
  const t = useTranslations("settings.subpages");
  const profile = useProfile();
  if (profile.isLoading) return <LoadingView />;
  if (!profile.data) return <ErrorView error={profile.error} onRetry={() => profile.refetch()} />;
  return (
    <>
      <Stack.Screen options={{ title: t("routineTitle") }} />
      <RoutineForm profile={profile.data} />
    </>
  );
}

function RoutineForm({ profile }: { profile: UserProfileDto }) {
  const t = useTranslations("settings.dailyRoutine");
  const errorMessage = useErrorMessage();
  const save = useSaveRoutine();
  const [initial] = useState(() => ({ weekday: parseRoutine(profile.dailyRoutine), weekend: parseRoutine(profile.weekendRoutine) }));
  const [routines, setRoutines] = useState(initial);
  const [kind, setKind] = useState<Kind>("weekday");
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(routines) !== JSON.stringify(initial);
  const { leave } = useCloseGuard(dirty && !save.isPending);

  const items = routines[kind];
  const setItems = (next: Item[]) => setRoutines((r) => ({ ...r, [kind]: next }));
  const update = (index: number, patch: Partial<Item>) => setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const switchKind = (next: Kind) => {
    setOpen(null);
    setKind(next);
  };

  const addRow = () => {
    setItems([...items, { time: nextTime(items), event: "" }]);
    setOpen(items.length);
  };

  const removeRow = (index: number) => {
    setOpen(null);
    setItems(items.filter((_, i) => i !== index));
  };

  const submit = () => {
    setError(null);
    save.mutate(
      { weekday: clean(routines.weekday), weekend: clean(routines.weekend) },
      { onSuccess: leave, onError: (err) => setError(errorMessage(err)) },
    );
  };

  const tabLabel = (key: Kind) => (routines[key].length > 0 ? `${t(key)} · ${routines[key].length}` : t(key));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppText variant="small">{t("hint")}</AppText>

      <Segmented
        options={[
          { value: "weekday", label: tabLabel("weekday") },
          { value: "weekend", label: tabLabel("weekend") },
        ]}
        value={kind}
        onChange={switchKind}
      />

      {items.length === 0 ? (
        <Card style={styles.empty}>
          <IconCircle icon="time-outline" color={colors.primary} size={44} />
          <AppText variant="muted" style={styles.center}>
            {t("empty")}
          </AppText>
          <Button label={t("useTemplate")} icon="sparkles-outline" variant="secondary" onPress={() => setItems(TEMPLATE)} />
        </Card>
      ) : (
        items.map((item, index) => (
          <Row
            key={`${kind}-${index}`}
            item={item}
            expanded={open === index}
            onToggle={() => setOpen(open === index ? null : index)}
            onTime={(time) => update(index, { time })}
            onEvent={(event) => {
              update(index, { event });
              setOpen(null);
            }}
            onRemove={() => removeRow(index)}
            // Snacks may repeat; wake, meals, sleep… only once per routine.
            usedElsewhere={(event) => !isRepeatableEvent(event) && items.some((other, j) => j !== index && other.event === event)}
          />
        ))
      )}

      {items.length < MAX_ITEMS ? (
        <Pressable
          accessibilityRole="button"
          onPress={addRow}
          style={({ pressed }) => [styles.addRow, pressed && { backgroundColor: colors.cardPressed }]}
        >
          <Ionicons name="add" size={18} color={colors.textMuted} />
          <AppText variant="muted">{t("addRow")}</AppText>
        </Pressable>
      ) : null}

      {error ? <ErrorBox message={error} /> : null}
      <Button label={t("save")} icon="save-outline" loading={save.isPending} onPress={submit} />
    </ScrollView>
  );
}

function Row({
  item,
  expanded,
  onToggle,
  onTime,
  onEvent,
  onRemove,
  usedElsewhere,
}: {
  item: Item;
  expanded: boolean;
  onToggle: () => void;
  onTime: (time: string) => void;
  onEvent: (event: string) => void;
  onRemove: () => void;
  usedElsewhere: (event: string) => boolean;
}) {
  const t = useTranslations("settings.dailyRoutine");
  const label = isEvent(item.event) ? t(`events.${item.event}`) : item.event;
  return (
    <View style={[styles.row, expanded && styles.rowOpen]}>
      <View style={styles.rowLine}>
        <View style={styles.time}>
          <TimeField value={item.time} onChange={onTime} accessibilityLabel={label || t("selectEvent")} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggle}
          style={({ pressed }) => [styles.eventButton, pressed && { backgroundColor: colors.cardPressed }]}
        >
          {isEvent(item.event) ? <Text style={styles.emoji}>{EVENT_ICONS[item.event]}</Text> : null}
          <AppText numberOfLines={1} style={[styles.grow, !item.event && { color: colors.textMuted }]}>
            {label || t("selectEvent")}
          </AppText>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("cancel")} hitSlop={6} onPress={onRemove} style={styles.remove}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Pressable>
      </View>
      {expanded ? (
        <View style={styles.events}>
          {ROUTINE_EVENTS.map(({ value }) => {
            const selected = item.event === value;
            const disabled = !selected && usedElsewhere(value);
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                onPress={() => onEvent(value)}
                style={[styles.event, selected && styles.eventOn, disabled && styles.eventDisabled]}
              >
                <Text style={styles.emoji}>{EVENT_ICONS[value]}</Text>
                <Text style={[styles.eventLabel, selected && styles.eventLabelOn]}>{t(`events.${value}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  grow: { flex: 1 },
  center: { textAlign: "center" },
  empty: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  row: {
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rowOpen: { borderColor: withAlpha(colors.primary, 0.5) },
  rowLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  time: { width: 96 },
  eventButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  remove: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 16 },
  events: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  event: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  eventOn: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.15) },
  eventDisabled: { opacity: 0.35 },
  eventLabel: { color: colors.text, fontSize: 13 },
  eventLabelOn: { color: colors.primary, fontWeight: "700" },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
});
