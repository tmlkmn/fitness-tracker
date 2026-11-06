import Ionicons from "@expo/vector-icons/Ionicons";
import type { NotificationDto } from "@fitmusc/shared/api/dto";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";

import { AppText, Card, Chip, ErrorView, LoadingView, Screen } from "@/components/ui";
import { useClearNotifications, useDeleteNotification, useMarkAllRead, useNotifications, useUnreadCount } from "@/hooks/notifications";
import { notificationTarget, openTarget } from "@/lib/notification-links";
import { colors, radius, spacing } from "@/lib/theme";

type Category = "reminder" | "share" | "membership" | "feedback" | "other";
type IconName = ComponentProps<typeof Ionicons>["name"];

const CATEGORY_ORDER: Category[] = ["reminder", "share", "membership", "feedback", "other"];

// The web's notification-types.ts: category, icon and accent per type.
const TYPES: Record<string, { category: Category; icon: IconName; color: string }> = {
  reminder_workout: { category: "reminder", icon: "barbell-outline", color: "#f97316" },
  reminder_meal: { category: "reminder", icon: "restaurant-outline", color: "#f59e0b" },
  reminder_custom: { category: "reminder", icon: "alarm-outline", color: "#f59e0b" },
  plan_shared: { category: "share", icon: "share-social-outline", color: "#0ea5e9" },
  user_invited: { category: "membership", icon: "ribbon-outline", color: "#10b981" },
  membership_extended: { category: "membership", icon: "ribbon-outline", color: "#10b981" },
  membership_expiring: { category: "membership", icon: "warning-outline", color: "#f59e0b" },
  membership_expired: { category: "membership", icon: "warning-outline", color: colors.danger },
  new_feedback: { category: "feedback", icon: "chatbubble-ellipses-outline", color: "#8b5cf6" },
  feedback_response: { category: "feedback", icon: "chatbubble-ellipses-outline", color: "#8b5cf6" },
};
const FALLBACK = { category: "other" as const, icon: "notifications-outline" as const, color: colors.textMuted };

function typeOf(type: string) {
  return TYPES[type] ?? (type.startsWith("reminder_") ? TYPES.reminder_custom : FALLBACK);
}

/** In-app notifications (web: the bell's dropdown). Opening marks them read. */
export default function NotificationsScreen() {
  const t = useTranslations("notifications");
  const tr = useTranslations();
  const list = useNotifications();
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();
  const clear = useClearNotifications();
  const [filter, setFilter] = useState<Category | "all">("all");
  const marked = useRef(false);
  const unreadCount = unread.data?.count ?? 0;

  useEffect(() => {
    if (marked.current || unreadCount === 0) return;
    marked.current = true;
    markAll.mutate();
  }, [unreadCount, markAll]);

  const items = list.data ?? [];
  const counts = new Map<Category, number>();
  for (const n of items) counts.set(typeOf(n.type).category, (counts.get(typeOf(n.type).category) ?? 0) + 1);
  const present = CATEGORY_ORDER.filter((c) => counts.has(c));
  const shown = filter === "all" ? items : items.filter((n) => typeOf(n.type).category === filter);

  const confirmClear = () =>
    Alert.alert(t("dropdown.clear"), tr("mobile.notifications.clearConfirm"), [
      { text: tr("common.cancel"), style: "cancel" },
      { text: t("dropdown.clear"), style: "destructive", onPress: () => clear.mutate() },
    ]);

  if (list.isLoading) return <LoadingView />;
  if (!list.data) return <ErrorView error={list.error} onRetry={() => list.refetch()} />;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("dropdown.title"),
          headerRight: items.length > 0 ? () => <ClearButton disabled={clear.isPending} onPress={confirmClear} /> : undefined,
        }}
      />
      <Screen refreshing={list.isRefetching} onRefresh={() => list.refetch()}>
        {present.length >= 2 ? (
          <View style={styles.chips}>
            <Chip label={`${t("dropdown.filterAll")} ${items.length}`} selected={filter === "all"} onPress={() => setFilter("all")} />
            {present.map((c) => {
              const label = t(`types.${c}`);
              return <Chip key={c} label={`${label} ${counts.get(c)}`} selected={filter === c} onPress={() => setFilter(c)} />;
            })}
          </View>
        ) : null}

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
            <AppText style={styles.emptyTitle}>{t("dropdown.empty")}</AppText>
            <AppText variant="muted">{t("dropdown.emptyHint")}</AppText>
          </View>
        ) : null}
        {items.length > 0 && shown.length === 0 ? <AppText variant="muted">{t("dropdown.emptyCategory")}</AppText> : null}
        {shown.map((n) => (
          <NotificationRow key={n.id} notification={n} now={list.dataUpdatedAt} />
        ))}
      </Screen>
    </>
  );
}

function ClearButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const t = useTranslations("notifications.dropdown");
  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress} disabled={disabled}>
      <AppText style={styles.clear}>{t("clear")}</AppText>
    </Pressable>
  );
}

function useTimeAgo() {
  const t = useTranslations("notifications.time");
  return (iso: string | null, now: number) => {
    if (!iso) return "";
    const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
    if (s < 60) return t("now");
    const m = Math.floor(s / 60);
    if (m < 60) return t("minutes", { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("hours", { count: h });
    return t("days", { count: Math.floor(h / 24) });
  };
}

function NotificationRow({ notification, now }: { notification: NotificationDto; now: number }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const timeAgo = useTimeAgo();
  const remove = useDeleteNotification();
  const config = typeOf(notification.type);
  const unread = !notification.isRead;
  const target = notificationTarget(notification.link, notification.type);

  return (
    <Pressable
      accessibilityRole={target ? "button" : undefined}
      disabled={!target}
      onPress={() => openTarget(target, (href) => router.navigate(href))}
    >
      {({ pressed }) => (
        <Card style={[styles.row, unread && { borderLeftWidth: 3, borderLeftColor: config.color }, pressed && styles.pressed]}>
          <View style={[styles.icon, { backgroundColor: `${config.color}22` }]}>
            <Ionicons name={config.icon} size={18} color={config.color} />
          </View>
          <View style={styles.grow}>
            <View style={styles.titleRow}>
              <AppText style={[styles.title, unread && styles.titleUnread]}>{notification.title}</AppText>
              {unread ? <View style={styles.dot} /> : null}
            </View>
            <AppText variant="muted" numberOfLines={3}>
              {notification.body}
            </AppText>
            <AppText variant="small">{timeAgo(notification.createdAt, now)}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("deleteLabel")}
            hitSlop={10}
            onPress={() => remove.mutate(notification.id)}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  pressed: { backgroundColor: colors.cardPressed },
  icon: { width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, fontWeight: "500" },
  titleUnread: { fontWeight: "700" },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
  clear: { color: colors.danger, fontWeight: "600" },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: { fontWeight: "600" },
});
