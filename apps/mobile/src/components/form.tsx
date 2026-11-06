import { formatDate } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useLocale } from "use-intl";

import { fromDateString, fromTimeString, toDateString, toTimeString } from "@/lib/dates";
import { colors, radius, spacing } from "@/lib/theme";

import { AppText } from "./ui";

export function Field({ label, error, children }: { label: string; error?: string | null; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="small">{label}</AppText>
      {children}
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
    </View>
  );
}

export function Input({ style, invalid, ...props }: TextInputProps & { invalid?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.primary}
      {...props}
      style={[styles.input, invalid && styles.inputInvalid, props.multiline && styles.multiline, style]}
    />
  );
}

/** Decimal input with a unit suffix; keeps the raw text (the form validates it). */
export function NumberInput({
  value,
  onChangeText,
  unit,
  invalid,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  invalid?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <View style={[styles.input, styles.numberRow, invalid && styles.inputInvalid]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        inputMode="decimal"
        placeholder="—"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        accessibilityLabel={accessibilityLabel}
        style={styles.numberText}
      />
      {unit ? <AppText variant="small">{unit}</AppText> : null}
    </View>
  );
}

const pickerLocale = (locale: Locale) => (locale === "tr" ? "tr-TR" : "en-GB");

/** `HH:MM` picker: inline compact control on iOS, the system dialog on Android. */
export function TimeField({ value, onChange, accessibilityLabel }: { value: string; onChange: (time: string) => void; accessibilityLabel: string }) {
  const locale = useLocale() as Locale;
  if (Platform.OS === "ios") {
    return (
      <View style={styles.iosPicker}>
        <DateTimePicker
          value={fromTimeString(value)}
          mode="time"
          display="compact"
          locale={pickerLocale(locale)}
          themeVariant="dark"
          accentColor={colors.primary}
          minuteInterval={5}
          accessibilityLabel={accessibilityLabel}
          onValueChange={(_event, date) => onChange(toTimeString(date))}
        />
      </View>
    );
  }
  return (
    <PickerButton
      label={value}
      accessibilityLabel={accessibilityLabel}
      onPress={() =>
        DateTimePickerAndroid.open({
          value: fromTimeString(value),
          mode: "time",
          is24Hour: true,
          onValueChange: (_event, date) => onChange(toTimeString(date)),
        })
      }
    />
  );
}

/** `YYYY-MM-DD` picker, same platform split as TimeField. */
export function DateField({
  value,
  onChange,
  minimumDate,
  maximumDate,
  accessibilityLabel,
}: {
  value: string;
  onChange: (date: string) => void;
  minimumDate?: string;
  maximumDate?: string;
  accessibilityLabel: string;
}) {
  const locale = useLocale() as Locale;
  const min = minimumDate ? fromDateString(minimumDate) : undefined;
  const max = maximumDate ? fromDateString(maximumDate) : undefined;
  if (Platform.OS === "ios") {
    return (
      <View style={styles.iosPicker}>
        <DateTimePicker
          value={fromDateString(value)}
          mode="date"
          display="compact"
          locale={pickerLocale(locale)}
          themeVariant="dark"
          accentColor={colors.primary}
          minimumDate={min}
          maximumDate={max}
          accessibilityLabel={accessibilityLabel}
          onValueChange={(_event, date) => onChange(toDateString(date))}
        />
      </View>
    );
  }
  return (
    <PickerButton
      label={formatDate(fromDateString(value), locale, { day: "numeric", month: "long", year: "numeric" })}
      accessibilityLabel={accessibilityLabel}
      onPress={() =>
        DateTimePickerAndroid.open({
          value: fromDateString(value),
          mode: "date",
          minimumDate: min,
          maximumDate: max,
          onValueChange: (_event, date) => onChange(toDateString(date)),
        })
      }
    />
  );
}

function PickerButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.input, styles.pickerButton, pressed && { backgroundColor: colors.cardPressed }]}
    >
      <AppText>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs, flex: 1 },
  input: {
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  inputInvalid: { borderColor: colors.danger },
  multiline: { minHeight: 80, paddingTop: spacing.md, textAlignVertical: "top" },
  numberRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  numberText: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: spacing.sm, fontVariant: ["tabular-nums"] },
  pickerButton: { justifyContent: "center" },
  iosPicker: { alignItems: "flex-start" },
  error: { color: colors.danger, fontSize: 12 },
});
