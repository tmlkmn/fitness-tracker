import Ionicons from "@expo/vector-icons/Ionicons";
import type { UserProfileDto } from "@fitmusc/shared/api/dto";
import { intlLocale, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { computeProfileCompleteness } from "@fitmusc/shared/profile-completeness";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { colors, radius, spacing, withAlpha } from "@/lib/theme";

import { AppText, Card, ProgressBar } from "./ui";
import { IconCircle, Pill, type IconName } from "./visual";

/** Small uppercase label over a card of rows, like the web's settings groups. */
export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  const locale = useLocale() as Locale;
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label.toLocaleUpperCase(intlLocale(locale))}</Text>
      <Card style={styles.groupCard}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={styles.separator} /> : null}
            {row}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

type Tone = "default" | "warning" | "danger";
const TONE_COLOR: Record<Tone, string> = { default: colors.primary, warning: colors.warning, danger: colors.danger };

/** Icon, title, subtitle and a trailing chevron (or any control) — one settings row. */
export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  tone = "default",
  external = false,
  disabled = false,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Replaces the chevron (a switch, a spinner, …). */
  trailing?: ReactNode;
  tone?: Tone;
  /** Opens a web page: shows the "leaves the app" mark instead of the chevron. */
  external?: boolean;
  disabled?: boolean;
}) {
  const color = TONE_COLOR[tone];
  const body = (pressed: boolean) => (
    <View style={[styles.row, pressed && { backgroundColor: colors.cardPressed }, disabled && { opacity: 0.5 }]}>
      <IconCircle icon={icon} color={color} size={36} />
      <View style={styles.rowText}>
        <AppText style={[styles.rowTitle, tone !== "default" && { color }]} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ??
        (onPress ? <Ionicons name={external ? "open-outline" : "chevron-forward"} size={18} color={colors.textMuted} /> : null)}
    </View>
  );
  if (!onPress) return body(false);
  return (
    <Pressable accessibilityRole={external ? "link" : "button"} accessibilityHint={subtitle} disabled={disabled} onPress={onPress}>
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

function Chip({ label, value, unit, primary }: { label: string; value: string | null; unit?: string; primary?: boolean }) {
  const locale = useLocale() as Locale;
  const filled = value != null && value !== "";
  const tint = !filled ? colors.warning : primary ? colors.primary : null;
  return (
    <View
      style={[
        styles.chip,
        tint ? { borderColor: withAlpha(tint, 0.4), backgroundColor: withAlpha(tint, 0.06) } : null,
      ]}
    >
      <Text style={styles.chipLabel} numberOfLines={1}>
        {label.toLocaleUpperCase(intlLocale(locale))}
      </Text>
      <Text style={[styles.chipValue, primary && filled ? { color: colors.primary } : null]} numberOfLines={1}>
        {filled ? `${value}${unit ? ` ${unit}` : ""}` : "—"}
      </Text>
    </View>
  );
}

const MEMBERSHIP_TYPES = ["unlimited", "1-month", "3-month", "6-month", "1-year", "custom"];

/** Name, membership, profile completion and the four body numbers — the web's profile summary. */
export function ProfileSummaryCard({
  name,
  email,
  profile,
  today,
}: {
  name: string | undefined;
  email: string | undefined;
  profile: UserProfileDto | undefined;
  today: string;
}) {
  const t = useTranslations("settings");
  const completeness = computeProfileCompleteness(profile ?? null);
  const type = profile?.membershipType ?? null;
  const typeLabel = type ? (MEMBERSHIP_TYPES.includes(type) ? t(`membershipTypes.${type}` as "membershipTypes.unlimited") : type) : null;
  const end = profile?.membershipEndDate ? new Date(profile.membershipEndDate).getTime() : null;
  const remaining = end == null ? null : Math.ceil((end - parseDateOnly(today).getTime()) / 86_400_000);
  const expired = remaining != null && remaining <= 0;
  const number = (v: string | null | undefined) => (v ? String(Number.parseFloat(v)) : null);

  return (
    <Card>
      <View style={styles.profileHead}>
        <IconCircle icon="person" color={colors.primary} size={44} />
        <View style={styles.rowText}>
          <AppText variant="heading" numberOfLines={1}>
            {name || email || t("profileSummary.fallbackName")}
          </AppText>
          {name && email ? (
            <AppText variant="small" numberOfLines={1}>
              {email}
            </AppText>
          ) : null}
        </View>
        {typeLabel ? (
          <Pill
            icon="card-outline"
            label={`${typeLabel}${remaining != null && !expired ? ` · ${remaining}${t("profileSummary.remainingDaysSuffix")}` : ""}`}
            color={expired ? colors.danger : colors.textMuted}
          />
        ) : null}
      </View>
      <View style={{ gap: spacing.xs }}>
        <View style={styles.between}>
          <AppText variant="small">{t("profileSummary.completion")}</AppText>
          <AppText variant="small" style={styles.tabular}>
            %{completeness.percent}
          </AppText>
        </View>
        <ProgressBar value={completeness.percent} max={100} color={completeness.percent < 100 ? colors.warning : colors.primary} />
      </View>
      <View style={styles.chips}>
        <Chip label={t("profileSummary.age")} value={profile?.age != null ? String(profile.age) : null} />
        <Chip label={t("profileSummary.height")} value={profile?.height != null ? String(profile.height) : null} unit="cm" />
        <Chip label={t("profileSummary.weight")} value={number(profile?.weight)} unit="kg" />
        <Chip label={t("profileSummary.target")} value={number(profile?.targetWeight)} unit="kg" primary />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  groupLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, paddingHorizontal: spacing.md },
  groupCard: { padding: 0, gap: 0, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg + 36 + spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 60 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  profileHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  between: { flexDirection: "row", justifyContent: "space-between" },
  tabular: { fontVariant: ["tabular-nums"] },
  chips: { flexDirection: "row", gap: spacing.xs },
  chip: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: withAlpha("#ffffff", 0.02),
  },
  chipLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 0.5 },
  chipValue: { color: colors.text, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
