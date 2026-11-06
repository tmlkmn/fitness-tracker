import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslations } from "use-intl";

import { useOutboxStatus } from "@/hooks/outbox";
import { colors } from "@/lib/theme";

import { Banner } from "./ui";

/** Offline, or ticks still waiting to be sent (the web's NetworkStatus strip). */
export function OfflineBanner() {
  const t = useTranslations("layout.networkStatus");
  const { online, pending } = useOutboxStatus();
  if (online && pending === 0) return null;

  let text = t("syncing", { count: pending });
  if (!online) text = pending > 0 ? `${t("offline")} · ${t("queued", { count: pending })}` : t("offline");
  return (
    <Banner icon={<Ionicons name={online ? "sync" : "cloud-offline-outline"} size={16} color={colors.warning} />}>{text}</Banner>
  );
}
