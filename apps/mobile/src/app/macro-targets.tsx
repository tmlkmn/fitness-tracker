import type { MacroTargetsDto } from "@fitmusc/shared/api/dto";
import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";

import { AiButton, AiDisclaimer, ErrorBox, Panel } from "@/components/ai";
import { Input } from "@/components/form";
import { AppText, Button, Card, Screen, useErrorMessage } from "@/components/ui";
import { useMacroAi, useResolvedMacroTargets, useSaveMacroStrategy } from "@/hooks/ai";
import { colors, spacing } from "@/lib/theme";

const MIN_CHARS = 20;
const MAX_CHARS = 600;

/** The daily macro targets and the AI macro calculator (web: /ayarlar/makro). */
export default function MacroTargetsScreen() {
  const t = useTranslations("meals.aiMacro");
  const ts = useTranslations("settings.subpages");
  const errorMessage = useErrorMessage();
  const targets = useResolvedMacroTargets();
  const ai = useMacroAi();
  const save = useSaveMacroStrategy();
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const length = description.trim().length;

  const calculate = () => {
    setError(null);
    save.reset();
    ai.mutate(description.trim(), { onError: (err) => setError(errorMessage(err)) });
  };
  const approve = () => {
    if (!ai.data) return;
    setError(null);
    save.mutate(ai.data.strategy, { onSuccess: () => ai.reset(), onError: (err) => setError(errorMessage(err)) });
  };

  return (
    <>
      <Stack.Screen options={{ title: ts("macroTitle") }} />
      <Screen refreshing={targets.isRefetching} onRefresh={() => targets.refetch()}>
        <AppText variant="muted">{ts("macroSubtitle")}</AppText>
        <Card>
          <MacroGrid macros={targets.data ?? null} />
        </Card>

        <Card>
          <AppText variant="heading">{t("title")}</AppText>
          <AppText variant="muted">{t("subtitle")}</AppText>
          <Input
            value={description}
            onChangeText={(v) => {
              setDescription(v.slice(0, MAX_CHARS));
              if (ai.data) ai.reset();
            }}
            placeholder={t("placeholder")}
            multiline
            maxLength={MAX_CHARS}
          />
          <View style={styles.counter}>
            {length > 0 && length < MIN_CHARS ? <AppText style={styles.minChars}>{t("minChars")}</AppText> : <View />}
            <AppText variant="small">
              {length}/{MAX_CHARS}
            </AppText>
          </View>
          <AiButton
            label={ai.isPending ? t("calculating") : t("calculate")}
            feature="macro-ai"
            variant="secondary"
            loading={ai.isPending}
            disabled={length < MIN_CHARS}
            onPress={calculate}
          />
        </Card>

        {error ? <ErrorBox message={error} /> : null}
        {save.isSuccess ? <AppText style={styles.saved}>✓ {t("saved")}</AppText> : null}

        {ai.data ? (
          <>
            <Panel title={t("title")} tone="suggested">
              <MacroGrid macros={ai.data.macros} />
              {ai.data.explanation ? <AppText variant="muted" style={styles.explanation}>“{ai.data.explanation}”</AppText> : null}
              <View style={styles.actions}>
                <Button label={save.isPending ? t("saving") : t("approve")} loading={save.isPending} style={{ flex: 1 }} onPress={approve} />
                <Button label={t("cancel")} variant="ghost" onPress={() => ai.reset()} />
              </View>
            </Panel>
            <AiDisclaimer reportContext={ai.data.explanation ?? undefined} />
          </>
        ) : null}
      </Screen>
    </>
  );
}

function MacroGrid({ macros }: { macros: MacroTargetsDto | null }) {
  const t = useTranslations("meals.aiMacro");
  const items = [
    { label: t("calorie"), value: macros?.calories, unit: "kcal" },
    { label: t("protein"), value: macros?.protein, unit: "g" },
    { label: t("carbs"), value: macros?.carbs, unit: "g" },
    { label: t("fat"), value: macros?.fat, unit: "g" },
  ];
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.cell}>
          <AppText variant="small">{item.label}</AppText>
          <AppText style={styles.value}>
            {item.value != null ? Math.round(item.value) : "—"}
            {item.value != null ? <AppText variant="small"> {item.unit}</AppText> : null}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: spacing.sm },
  cell: { flex: 1, alignItems: "center", gap: 2 },
  value: { fontSize: 17, fontWeight: "600", fontVariant: ["tabular-nums"] },
  counter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  minChars: { color: colors.warning, fontSize: 12 },
  saved: { color: colors.primary, textAlign: "center", fontWeight: "600" },
  explanation: { fontStyle: "italic" },
  actions: { flexDirection: "row", gap: spacing.sm },
});
