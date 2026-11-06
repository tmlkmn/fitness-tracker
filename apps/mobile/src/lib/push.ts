import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
// Named import: eslint-plugin-import can't see the enum through the namespace's export * chain.
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

import { api } from "./api";

export type PushRegistration =
  | { status: "registered"; token: string }
  | { status: "denied" }
  | { status: "unavailable"; reason: "simulator" | "expo-go-android" | "no-project-id" | "error" };

// Show pushes as banners while the app is open too (ai-job, reminders, …).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Asks for permission, gets the Expo push token and registers it with the
 * server (POST /push/expo-token). Never throws. Remote pushes need a physical
 * device, an EAS projectId (`eas init`) and — on Android — a development
 * build: Expo Go on Android has no remote notifications.
 */
export async function registerForPush(): Promise<PushRegistration> {
  if (!Device.isDevice) return { status: "unavailable", reason: "simulator" };
  if (Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return { status: "unavailable", reason: "expo-go-android" };
  }
  const id = projectId();
  if (!id) return { status: "unavailable", reason: "no-project-id" };

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "FitMusc",
        importance: AndroidImportance.DEFAULT,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== "granted") return { status: "denied" };

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await api("/push/expo-token", {
      method: "POST",
      body: { token, platform: Platform.OS === "ios" ? "ios" : "android" },
    });
    currentToken = token;
    return { status: "registered", token };
  } catch (err) {
    if (__DEV__) console.warn("[push] registration failed", err);
    return { status: "unavailable", reason: "error" };
  }
}

/** Call before signing out, so this device stops getting the account's pushes. */
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await api("/push/expo-token", { method: "DELETE", body: { token } }).catch(() => {});
}
