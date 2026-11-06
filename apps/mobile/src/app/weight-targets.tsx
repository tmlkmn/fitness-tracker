import { decimalString } from "@fitmusc/shared/api/schemas";
import { Stack } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";

import { AiButton, AiDisclaimer, ErrorBox, Panel } from "@/components/ai";
import { Field, NumberInput } from "@/components/form";
import { AppText, Button, Card, ErrorView, LoadingView, useErrorMessage } from "@/components/ui";
import { useSaveWeightTargets, useSuggestTargetWeight } from "@/hooks/ai";
import { useCloseGuard } from "@/hooks/close-guard";
import { useProfile, useProgressLogs } from "@/hooks/wellness";
import { colors, spacing } from "@/lib/theme";

const normalize = (raw: string) => raw.trim().replace(",", ".");

/** Start and target weight, with the AI target suggestion (web: WeightTargetEditor). */
export default function WeightTargetsScreen() {
  const t = useTranslations("progress.weightTarget");
  const profile = useProfile();
  const logs = useProgressLogs();
  if (profile.isLoading || logs.isLoading) return <LoadingView />;
  if (!profile.data) return <ErrorView error={profile.error} onRetry={() => profile.refetch()} />;
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <WeightTargetsForm
        start={profile.data.weight ?? ""}
        target={profile.data.targetWeight ?? ""}
        // The suggestion reads the latest measurement — the web offers it only once there is one.
        canSuggest={(logs.data ?? []).some((log) => log.weight)}
      />
    </>
  );
}

function WeightTargetsForm({ start, target, canSuggest }: { start: string; target: string; canSuggest: boolean }) {
  const t = useTranslations("progress.weightTarget");
  const tm = useTranslations("mobile.progress");
  const errorMessage = useErrorMessage();
  const suggest = useSuggestTargetWeight();
  const save = useSaveWeightTargets();
  const [startWeight, setStartWeight] = useState(start);
  const [targetWeight, setTargetWeight] = useState(target);
  const [error, setError] = useState<string | null>(null);
  const dirty = startWeight !== start || targetWeight !== target;
  const { leave } = useCloseGuard(dirty && !save.isPending);

  const submit = () => {
    setError(null);
    const weight = normalize(startWeight);
    const goal = normalize(targetWeight);
    if ((weight && !decimalString.safeParse(weight).success) || (goal && !decimalString.safeParse(goal).success)) {
      return setError(tm("invalidNumber"));
    }
    // PUT: an empty field is cleared, like the web form.
    save.mutate(
      { weight: weight || undefined, targetWeight: goal || undefined },
      { onSuccess: leave, onError: (err) => setError(errorMessage(err)) },
    );
  };

  const suggestion = suggest.data;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <Card>
        <View style={styles.row}>
          <Field label={t("startWeight")}>
            <NumberInput value={startWeight} onChangeText={setStartWeight} unit="kg" accessibilityLabel={t("startWeight")} />
          </Field>
          <Field label={t("targetWeight")}>
            <NumberInput value={targetWeight} onChangeText={setTargetWeight} unit="kg" accessibilityLabel={t("targetWeight")} />
          </Field>
        </View>
      </Card>

      {canSuggest && !suggestion ? (
        <AiButton
          label={suggest.isPending ? t("calculating") : t("aiSuggest")}
          feature="target-weight"
          variant="secondary"
          loading={suggest.isPending}
          onPress={() => {
            setError(null);
            suggest.mutate(undefined, { onError: (err) => setError(errorMessage(err)) });
          }}
        />
      ) : null}

      {suggestion ? (
        <>
          <Panel title={t("aiSuggestion")} right={t("weeks", { n: suggestion.timelineWeeks })} tone="suggested">
            <AppText style={styles.suggested}>{suggestion.targetWeight} kg</AppText>
            <AppText variant="muted">{suggestion.reasoning}</AppText>
            <View style={styles.row}>
              <Button
                label={t("accept")}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  setTargetWeight(String(suggestion.targetWeight));
                  suggest.reset();
                }}
              />
              <Button label="✕" variant="ghost" onPress={() => suggest.reset()} />
            </View>
          </Panel>
          <AiDisclaimer />
        </>
      ) : null}

      {error ? <ErrorBox message={error} /> : null}
      <Button label={save.isPending ? t("saving") : t("save")} loading={save.isPending} onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  suggested: { fontSize: 22, fontWeight: "700", color: colors.primary },
});
