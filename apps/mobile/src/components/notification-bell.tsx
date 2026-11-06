import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { useUnreadCount } from "@/hooks/notifications";
import { colors, radius } from "@/lib/theme";

/** Header bell with the unread count (web: NotificationBell); opens the notifications. */
export function NotificationBell() {
  const t = useTranslations("notifications.dropdown");
  const router = useRouter();
  const count = useUnreadCount().data?.count ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${t("title")}, ${count}` : t("title")}
      hitSlop={8}
      onPress={() => router.push("/notifications")}
      style={styles.bell}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: radius.full,
    backgroundColor: colors.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
