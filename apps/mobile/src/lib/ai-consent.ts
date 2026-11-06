import AsyncStorage from "@react-native-async-storage/async-storage";

// Permission to send the user's data to the AI provider (Anthropic) — App
// Store guideline 5.1.2(i) asks for explicit consent before personal data is
// shared with a third-party AI. Kept per account on this device; nothing that
// calls the AI runs before it is granted (useRequireAiConsent).

const keyFor = (userId: string) => `fitmusc.aiConsent.${userId}`;

const granted = new Map<string, boolean>();
const loading = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeAiConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** true / false once read from storage, undefined while unknown. */
export function aiConsentOf(userId: string): boolean | undefined {
  return granted.get(userId);
}

export function loadAiConsent(userId: string) {
  if (granted.has(userId) || loading.has(userId)) return;
  loading.add(userId);
  AsyncStorage.getItem(keyFor(userId))
    .then((value) => granted.set(userId, value != null))
    .catch(() => granted.set(userId, false))
    .finally(() => {
      loading.delete(userId);
      notify();
    });
}

export async function setAiConsent(userId: string, value: boolean) {
  granted.set(userId, value);
  notify();
  try {
    if (value) await AsyncStorage.setItem(keyFor(userId), new Date().toISOString());
    else await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // Kept for this session; asked again after a restart.
  }
}
