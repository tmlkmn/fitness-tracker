import { onlineManager } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { useTranslations } from "use-intl";

import { ApiRequestError } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";

type TextVariant = "title" | "heading" | "body" | "muted" | "small";

export function AppText({ variant = "body", style, ...props }: TextProps & { variant?: TextVariant }) {
  return <Text {...props} style={[styles.text, textStyles[variant], style]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  const fg = variant === "primary" ? colors.primaryText : variant === "danger" ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[variant],
        pressed && !inactive && styles.buttonPressed,
        inactive && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

/** Scrollable screen body with pull-to-refresh. */
export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

/** Turns any thrown error into a sentence for the user. */
export function useErrorMessage() {
  const t = useTranslations("mobile.errors");
  return (error: unknown): string => {
    // No error object while offline: a query paused with nothing saved yet.
    if (!(error instanceof ApiRequestError)) return onlineManager.isOnline() ? t("generic") : t("network");
    switch (error.code) {
      case "NETWORK":
        return t("network");
      case "RATE_LIMITED":
      case "COOLDOWN":
        // A daily AI quota answers RATE_LIMITED without Retry-After.
        return error.retryAfter ? t("rateLimited", { seconds: error.retryAfter }) : t("quotaReached");
      case "AI_UNAVAILABLE":
      case "AI_EMPTY_RESPONSE":
        return t("aiUnavailable");
      case "JOB_TIMEOUT":
        return t("jobTimeout");
      case "NOT_ENOUGH_DATA":
        return t("notEnoughData");
      default:
        return t("generic");
    }
  };
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTranslations("mobile.errors");
  const message = useErrorMessage();
  return (
    <View style={[styles.center, { gap: spacing.lg }]}>
      <AppText variant="muted" style={{ textAlign: "center" }}>
        {message(error)}
      </AppText>
      {onRetry ? <Button label={t("retry")} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function ProgressBar({ value, max, color = colors.primary }: { value: number; max: number; color?: string }) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="heading">{children}</AppText>
      {right}
    </View>
  );
}

/** One-of-n switch (tabs inside a screen). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentActive]}
          >
            <Text numberOfLines={1} style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small selectable pill (filters, metric pickers). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

/** Warning strip (past day, …). */
export function Banner({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.banner}>
      {icon}
      <Text style={styles.bannerText}>{children}</Text>
    </View>
  );
}

const textStyles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700" },
  heading: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 21 },
  muted: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  small: { fontSize: 12, color: colors.textMuted },
});

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: "transparent", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.dangerBg },
});

const styles = StyleSheet.create({
  text: { color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontSize: 16, fontWeight: "600" },
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.background },
  track: { height: 6, borderRadius: radius.full, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.cardPressed },
  segmentLabel: { color: colors.textMuted, fontWeight: "500", fontSize: 14 },
  segmentLabelActive: { color: colors.text },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "500" },
  chipLabelActive: { color: colors.primaryText },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245, 158, 11, 0.35)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  bannerText: { flex: 1, color: colors.warning, fontSize: 13, fontWeight: "500" },
});
