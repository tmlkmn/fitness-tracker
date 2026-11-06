import { usePreventRemove, useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { useTranslations } from "use-intl";

/**
 * Asks before a form with unsaved input is closed — back button, header back
 * and the iOS modal swipe all go through it. Call `leave()` after a successful
 * save (or delete) to close without asking.
 */
export function useCloseGuard(dirty: boolean) {
  const t = useTranslations("meals.form");
  const router = useRouter();
  const [released, setReleased] = useState(false);

  const disable = usePreventRemove(dirty && !released, ({ repeat }) => {
    Alert.alert(t("unsavedTitle"), t("unsavedBody"), [
      { text: t("unsavedKeep"), style: "cancel" },
      {
        text: t("unsavedClose"),
        style: "destructive",
        onPress: () => {
          setReleased(true);
          repeat();
        },
      },
    ]);
  });

  return {
    leave: () => {
      setReleased(true);
      disable();
      router.back();
    },
  };
}
