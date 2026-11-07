import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { colors, radius, spacing, withAlpha } from "@/lib/theme";

import { AppText } from "./ui";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** Small coloured label with an icon (plan type, membership, …). Text keeps the colour too, so it reads on its own. */
export function Pill({ icon, label, color }: { icon?: IconName; label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(color, 0.15) }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={[styles.pillLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Icon on a tinted disc — the web's coloured section and widget marks. */
export function IconCircle({ icon, color, size = 32 }: { icon: IconName; color: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, backgroundColor: withAlpha(color, 0.15) }]}>
      <Ionicons name={icon} size={Math.round(size * 0.55)} color={color} />
    </View>
  );
}

/** Card heading with a leading icon and optional right-hand detail. */
export function CardHeading({ icon, color = colors.primary, title, right }: { icon: IconName; color?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.heading}>
      <Ionicons name={icon} size={18} color={color} />
      <AppText variant="heading" style={styles.headingText} numberOfLines={1}>
        {title}
      </AppText>
      {typeof right === "string" ? <AppText variant="small">{right}</AppText> : right}
    </View>
  );
}

/** One number in a row of stats: icon, small label, value with unit. */
export function StatTile({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ""}`}>
      <Ionicons name={icon} size={16} color={accent ?? colors.textMuted} />
      <AppText variant="small" numberOfLines={1}>
        {label}
      </AppText>
      <Text style={[styles.statValue, accent ? { color: accent } : null]} numberOfLines={1}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export interface RingSpec {
  value: number;
  max: number;
  color: string;
}

/** Concentric progress rings (outermost first) with content in the middle. */
export function MultiRing({
  rings,
  size = 128,
  strokeWidth = 10,
  gap = 3,
  children,
  style,
}: {
  rings: RingSpec[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = size / 2;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${c} ${c})`}>
          {rings.map((ring, i) => {
            const r = c - strokeWidth / 2 - i * (strokeWidth + gap);
            const circumference = 2 * Math.PI * r;
            const ratio = ring.max > 0 ? Math.min(Math.max(ring.value / ring.max, 0), 1) : 0;
            return (
              <G key={i}>
                <Circle cx={c} cy={c} r={r} stroke={withAlpha(ring.color, 0.25)} strokeWidth={strokeWidth} fill="none" />
                {ratio > 0 ? (
                  <Circle
                    cx={c}
                    cy={c}
                    r={r}
                    stroke={ring.color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={circumference * (1 - ratio)}
                  />
                ) : null}
              </G>
            );
          })}
        </G>
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  pillLabel: { fontSize: 12, fontWeight: "600" },
  circle: { borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headingText: { flex: 1, fontSize: 15 },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: 2 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  statUnit: { color: colors.textMuted, fontSize: 11, fontWeight: "400" },
  ringCenter: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
});
