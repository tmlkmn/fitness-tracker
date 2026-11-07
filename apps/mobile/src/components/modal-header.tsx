import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";

import { colors, radius } from "@/lib/theme";

/**
 * Close (X) in the header of every modal screen. A swipe down is not
 * discoverable on iOS and does not exist on Android, so this is the visible
 * way out. It goes through `router.back()`, so a form's unsaved-input guard
 * (useCloseGuard) still asks first.
 */
export function ModalCloseButton() {
  const t = useTranslations("common");
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("close")}
      hitSlop={12}
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      style={({ pressed }) => [styles.close, pressed && styles.pressed]}
    >
      <Ionicons name="close" size={24} color={colors.text} />
    </Pressable>
  );
}

/** iOS sheet grabber drawn into the header background: the cue that the page can be pulled down. */
export function SheetGrabberBackground() {
  return (
    <View style={styles.background}>
      <View style={styles.grabber} />
    </View>
  );
}

/** Stack options shared by every modal screen. */
export const modalScreenOptions = {
  title: "",
  presentation: "modal",
  headerLeft: () => <ModalCloseButton />,
  // Only iOS page sheets can be swiped down; an Android modal is a full screen.
  headerBackground: Platform.OS === "ios" ? () => <SheetGrabberBackground /> : undefined,
} as const;

const styles = StyleSheet.create({
  close: { padding: 4, borderRadius: radius.full },
  pressed: { opacity: 0.6 },
  background: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  grabber: { marginTop: 6, width: 36, height: 5, borderRadius: radius.full, backgroundColor: "#52525b" },
});
