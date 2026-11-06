import Ionicons from "@expo/vector-icons/Ionicons";
import type { ProgressLogDto } from "@fitmusc/shared/api/dto";
import { decimalString, progressLogSchema } from "@fitmusc/shared/api/schemas";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";

import { DateField, Field, Input, NumberInput } from "@/components/form";
import { AppText, Button, Card, ErrorView, LoadingView, useErrorMessage } from "@/components/ui";
import { useCloseGuard } from "@/hooks/close-guard";
import { useDeleteProgressLog, useProfile, useProgressLogs, useSaveProgressLog, type ProgressLogInput } from "@/hooks/wellness";
import { todayStr } from "@/lib/dates";
import {
  ALL_FIELDS,
  BODY_PARTS,
  MAIN_FIELDS,
  MEASUREMENT_FIELDS,
  bodyPartFields,
  type MeasurementKey,
} from "@/lib/progress-metrics";
import { colors, spacing } from "@/lib/theme";

type Values = Record<MeasurementKey, string>;

const emptyValues = () => Object.fromEntries(ALL_FIELDS.map((k) => [k, ""])) as Values;
const valuesOf = (log: ProgressLogDto) => Object.fromEntries(ALL_FIELDS.map((k) => [k, log[k] ?? ""])) as Values;

/** "72,5" (TR keyboard) → "72.5". */
const normalize = (raw: string) => raw.trim().replace(",", ".");

export default function ProgressLogScreen() {
  const t = useTranslations("progress.modal");
  const { id } = useLocalSearchParams<{ id?: string }>();
  const logs = useProgressLogs();
  const editId = id ? Number(id) : null;

  if (logs.isLoading) return <LoadingView />;
  if (!logs.data) return <ErrorView error={logs.error} onRetry={() => logs.refetch()} />;
  const editing = editId != null ? logs.data.find((l) => l.id === editId) : undefined;
  if (editId != null && !editing) return <ErrorView error={null} />;

  return (
    <>
      <Stack.Screen options={{ title: editing ? t("editTitle") : t("newTitle") }} />
      <ProgressForm key={editing?.id ?? "new"} editing={editing} latest={logs.data[0]} />
    </>
  );
}

function ProgressForm({ editing, latest }: { editing: ProgressLogDto | undefined; latest: ProgressLogDto | undefined }) {
  const t = useTranslations();
  const tm = useTranslations("progress.modal");
  const errorMessage = useErrorMessage();
  const height = Number(useProfile().data?.height ?? 0);
  const save = useSaveProgressLog(editing?.id ?? null);
  const remove = useDeleteProgressLog();

  const [logDate, setLogDate] = useState(editing?.logDate ?? todayStr());
  const [values, setValues] = useState<Values>(() => (editing ? valuesOf(editing) : emptyValues()));
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [bmiTouched, setBmiTouched] = useState(Boolean(editing?.bmi));
  const [showParts, setShowParts] = useState(() =>
    BODY_PARTS.some(([, prefix]) => bodyPartFields(prefix).some(([k]) => editing?.[k])),
  );
  const [invalid, setInvalid] = useState<Set<MeasurementKey>>(new Set());
  const [initial] = useState(() => ({ logDate, values, notes }));
  const dirty =
    logDate !== initial.logDate || notes !== initial.notes || ALL_FIELDS.some((k) => values[k] !== initial.values[k]);
  const { leave } = useCloseGuard(dirty && !save.isPending && !remove.isPending);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (key: MeasurementKey, text: string) => {
    setValues((prev) => {
      const next = { ...prev, [key]: text };
      // BMI follows the weight (profile height) until edited by hand — same as the web.
      if (key === "weight" && !bmiTouched && height > 0) {
        const weight = Number(normalize(text));
        next.bmi = weight > 0 ? (weight / (height / 100) ** 2).toFixed(1) : "";
      }
      return next;
    });
    if (key === "bmi") setBmiTouched(true);
    if (invalid.has(key)) setInvalid((prev) => new Set([...prev].filter((k) => k !== key)));
  };

  const copyPrevious = () => {
    if (!latest) return;
    setValues(valuesOf(latest));
    setBmiTouched(Boolean(latest.bmi));
  };

  const submit = () => {
    setFormError(null);
    const body: Record<string, string> = {};
    const bad = new Set<MeasurementKey>();
    for (const key of ALL_FIELDS) {
      const value = normalize(values[key]);
      if (!value) continue;
      if (decimalString.safeParse(value).success) body[key] = value;
      else bad.add(key);
    }
    setInvalid(bad);
    if (bad.size > 0) return setFormError(t("mobile.progress.invalidNumber"));
    const note = notes.trim();
    if (!editing && Object.keys(body).length === 0 && !note) return setFormError(t("mobile.progress.nothingEntered"));

    // On edit an empty note clears it; omitted measurements keep their value (PATCH).
    const input: ProgressLogInput = { logDate, ...body, notes: editing ? note : note || undefined };
    const parsed = progressLogSchema.safeParse(input);
    if (!parsed.success) return setFormError(t("mobile.progress.invalidNumber"));
    save.mutate(parsed.data, {
      onSuccess: leave,
      onError: (err) => setFormError(errorMessage(err)),
    });
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert(t("progress.deleteTitle"), t("progress.deleteConfirm"), [
      { text: t("progress.cancel"), style: "cancel" },
      {
        text: t("progress.delete"),
        style: "destructive",
        onPress: () =>
          remove.mutate(editing.id, {
            onSuccess: leave,
            onError: (err) => setFormError(errorMessage(err)),
          }),
      },
    ]);
  };

  const numberField = ([key, unit, label]: readonly [MeasurementKey, string, string]) => (
    <Field key={key} label={tm(label)}>
      <NumberInput
        value={values[key]}
        onChangeText={(text) => set(key, text)}
        unit={unit}
        invalid={invalid.has(key)}
        accessibilityLabel={unit ? `${tm(label)} (${unit})` : tm(label)}
      />
    </Field>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <Card>
        <View style={styles.dateRow}>
          <AppText variant="muted">{tm("date")}</AppText>
          <DateField value={logDate} onChange={setLogDate} maximumDate={todayStr()} accessibilityLabel={tm("date")} />
        </View>
        {!editing && latest ? <Button label={tm("copyPrevious")} variant="ghost" onPress={copyPrevious} /> : null}
        {editing ? <AppText variant="small">{t("mobile.progress.keepsValues")}</AppText> : null}
      </Card>

      <Card>
        <AppText variant="heading">{tm("mainInfo")}</AppText>
        <Grid>{MAIN_FIELDS.map(numberField)}</Grid>
      </Card>

      <Card>
        <AppText variant="heading">{tm("measurements")}</AppText>
        <Grid>{MEASUREMENT_FIELDS.map(numberField)}</Grid>
      </Card>

      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showParts }}
          onPress={() => setShowParts((v) => !v)}
          style={styles.collapseHeader}
        >
          <View style={styles.grow}>
            <AppText variant="heading">{tm("bodyParts")}</AppText>
            <AppText variant="small">{t("mobile.progress.bodyPartsHint")}</AppText>
          </View>
          <Ionicons name={showParts ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
        </Pressable>
        {showParts
          ? BODY_PARTS.map(([label, prefix]) => (
              <View key={prefix} style={{ gap: spacing.sm }}>
                <AppText style={styles.partTitle}>{tm(label)}</AppText>
                <Grid>{bodyPartFields(prefix).map(numberField)}</Grid>
              </View>
            ))
          : null}
      </Card>

      <Card>
        <Field label={tm("notes")}>
          <Input value={notes} onChangeText={setNotes} placeholder={tm("notesPlaceholder")} multiline maxLength={1000} />
        </Field>
      </Card>

      {formError ? <AppText style={styles.error}>{formError}</AppText> : null}
      <Button label={editing ? tm("update") : tm("save")} loading={save.isPending} onPress={submit} />
      {editing ? <Button label={t("progress.delete")} variant="danger" loading={remove.isPending} onPress={confirmDelete} /> : null}
    </ScrollView>
  );
}

/** Two fields per row. */
function Grid({ children }: { children: ReactNode[] }) {
  const rows: ReactNode[][] = [];
  children.forEach((child, i) => {
    if (i % 2 === 0) rows.push([child]);
    else rows[rows.length - 1].push(child);
  });
  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row, i) => (
        <View key={i} style={styles.gridRow}>
          {row}
          {row.length === 1 ? <View style={styles.grow} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  gridRow: { flexDirection: "row", gap: spacing.md },
  collapseHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  partTitle: { fontWeight: "600" },
  grow: { flex: 1 },
  error: { color: colors.danger, textAlign: "center" },
});
