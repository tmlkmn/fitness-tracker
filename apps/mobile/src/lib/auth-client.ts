import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

import { API_URL, APP_SCHEME } from "./config";

const APP_ORIGIN = `${APP_SCHEME}://`;

/**
 * The expo plugin sends `expo-origin` = Linking.createURL(""), which is the
 * app scheme in a real build but `exp://<ip>:<port>` inside Expo Go. The
 * server only trusts `fitmusc://` (trusting exp:// in production would let a
 * password-reset redirect point at any Expo Go bundle), so report the app
 * scheme either way. The origin check is a browser CSRF guard — a browser
 * cannot send this custom header cross-site — so this changes nothing for it.
 */
function withAppOrigin(init?: RequestInit): RequestInit | undefined {
  if (!init?.headers) return init;
  const headers = new Headers(init.headers);
  if (headers.get("expo-origin")?.startsWith("exp://")) headers.set("expo-origin", APP_ORIGIN);
  return { ...init, headers };
}

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    customFetchImpl: (input, init) => fetch(input, withAppOrigin(init)),
  },
  plugins: [
    expoClient({ scheme: APP_SCHEME, storagePrefix: "fitmusc", storage: SecureStore }),
    // Server-side user fields the app reads (apps/web/src/lib/auth.ts).
    inferAdditionalFields({
      user: {
        role: { type: "string", required: false },
        locale: { type: "string", required: false },
        isApproved: { type: "boolean", required: false },
        mustChangePassword: { type: "boolean", required: false },
      },
    }),
  ],
});

export type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>["data"]>["user"];
