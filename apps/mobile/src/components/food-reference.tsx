import Ionicons from "@expo/vector-icons/Ionicons";
import type { UserFoodDto } from "@fitmusc/shared/api/dto";
import { userFoodSchema } from "@fitmusc/shared/api/schemas";
import { multiplyFood, type FoodLike } from "@fitmusc/shared/food-math";
import { FOOD_CATEGORY_KEYS, getFoodsByLocale, type FoodCategory } from "@fitmusc/shared/foods";
import type { Locale } from "@fitmusc/shared/locale";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { useCreateUserFood, useDeleteUserFood, useUserFoods } from "@/hooks/edit";
import { colors, radius, spacing } from "@/lib/theme";

import { Field, Input, NumberInput } from "./form";
import { AppText, Button, Card, Chip, ErrorView, LoadingView, Segmented, useErrorMessage } from "./ui";

// Portion multiplier bounds, like the web's FoodReferencePopover.
const STEP = 0.25;
const MIN = 0.25;
const MAX = 10;

/** Search key that ignores case and the dotted / dotless i (İ, I, ı, i all match). */
export function searchKey(text: string) {
  return text.replaceAll("İ", "i").toLowerCase().replaceAll("̇", "").replaceAll("ı", "i");
}

type Tab = "preset" | "user";
type Row = { key: string; food: FoodLike; userFoodId?: number };

const toFood = (f: UserFoodDto): FoodLike => ({
  name: f.name,
  portion: f.portion,
  calories: f.calories,
  protein: Number(f.proteinG ?? 0) || 0,
  carbs: Number(f.carbsG ?? 0) || 0,
  fat: Number(f.fatG ?? 0) || 0,
});

/** The web's food reference: preset foods by category plus the user's own, added with a portion multiplier. */
export function FoodReference({ onAdd, onClose }: { onAdd: (food: FoodLike, multiplier: number) => void; onClose: () => void }) {
  const t = useTranslations("meals.foodReference");
  const tc = useTranslations("foods.categories");
  const tp = useTranslations("meals.picker");
  const tm = useTranslations("mobile.mealForm");
  const td = useTranslations("common");
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const userFoods = useUserFoods(true);
  const remove = useDeleteUserFood();
  const [tab, setTab] = useState<Tab>("preset");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const q = searchKey(query.trim());
  const matches = (name: string) => !q || searchKey(name).includes(q);
  const rows: Row[] =
    tab === "preset"
      ? getFoodsByLocale(locale)
          .filter((food) => (!category || food.category === category) && matches(food.name))
          .map((food) => ({ key: `preset-${food.category}-${food.name}`, food }))
      : (userFoods.data ?? [])
          .filter((food) => matches(food.name))
          .map((food) => ({ key: `user-${food.id}`, food: toFood(food), userFoodId: food.id }));

  const confirmDelete = (row: Row) => {
    const id = row.userFoodId;
    if (id == null) return;
    Alert.alert(td("delete"), row.food.name, [
      { text: td("cancel"), style: "cancel" },
      {
        text: td("delete"),
        style: "destructive",
        onPress: () => remove.mutate(id, { onError: (err) => Alert.alert(errorMessage(err)) }),
      },
    ]);
  };

  const userLoading = tab === "user" && userFoods.isLoading;
  const userFailed = tab === "user" && userFoods.error && !userFoods.data;
  // Preset: category filter. Mine: the new-food form or its button.
  let tools = (
    <View style={styles.chips}>
      <Chip label={t("all")} selected={category === null} onPress={() => setCategory(null)} />
      {FOOD_CATEGORY_KEYS.map((key) => (
        <Chip key={key} label={tc(key)} selected={category === key} onPress={() => setCategory(key)} />
      ))}
    </View>
  );
  if (tab === "user") {
    tools = creating ? (
      <NewFoodForm onDone={() => setCreating(false)} />
    ) : (
      <Button label={`+ ${t("addNew")}`} variant="secondary" onPress={() => setCreating(true)} />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <AppText variant="heading">{t("title")}</AppText>
      <Segmented
        options={[
          { value: "preset", label: t("tabPreset") },
          { value: "user", label: t("tabUser", { count: userFoods.data?.length ?? 0 }) },
        ]}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setSelected(null);
        }}
      />
      <Input value={query} onChangeText={setQuery} placeholder={t("searchPlaceholder")} autoCorrect={false} returnKeyType="search" />

      {tools}

      {userLoading ? <LoadingView /> : null}
      {userFailed ? <ErrorView error={userFoods.error} onRetry={() => userFoods.refetch()} /> : null}
      {!userLoading && !userFailed && rows.length === 0 ? (
        <AppText variant="muted">{tab === "user" && !q ? t("empty") : tm("noCandidates")}</AppText>
      ) : null}

      {rows.map((row) => (
        <FoodRow
          key={row.key}
          food={row.food}
          selected={selected === row.key}
          onSelect={() => setSelected((current) => (current === row.key ? null : row.key))}
          onAdd={(multiplier) => onAdd(row.food, multiplier)}
          onDelete={row.userFoodId != null ? () => confirmDelete(row) : undefined}
        />
      ))}
      <Button label={tp("close")} variant="ghost" onPress={onClose} />
    </ScrollView>
  );
}

function FoodRow({
  food,
  selected,
  onSelect,
  onAdd,
  onDelete,
}: {
  food: FoodLike;
  selected: boolean;
  onSelect: () => void;
  onAdd: (multiplier: number) => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("meals.macroSummary");
  const td = useTranslations("common");
  return (
    <Card style={selected && styles.selected}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: selected }} onPress={onSelect} style={styles.rowHead}>
        <View style={styles.grow}>
          <AppText style={styles.name}>{food.name}</AppText>
          <AppText variant="small">
            {food.portion} · {food.calories} kcal · {t("protein")} {food.protein} · {t("carbs")} {food.carbs} · {t("fat")} {food.fat}
          </AppText>
        </View>
        {onDelete ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${td("delete")}: ${food.name}`} hitSlop={8} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        ) : null}
        <Ionicons name={selected ? "chevron-up" : "add-circle-outline"} size={22} color={colors.primary} />
      </Pressable>
      {selected ? <PortionStepper food={food} onAdd={onAdd} /> : null}
    </Card>
  );
}

function PortionStepper({ food, onAdd }: { food: FoodLike; onAdd: (multiplier: number) => void }) {
  const tf = useTranslations("meals.form");
  const tm = useTranslations("mobile.mealForm");
  const [multiplier, setMultiplier] = useState(1);
  const step = (delta: number) => setMultiplier((m) => Math.min(MAX, Math.max(MIN, Number((m + delta).toFixed(2)))));
  const shown = String(Number(multiplier.toFixed(2))); // 1, 1.25, 1.5

  return (
    <View style={styles.stepper}>
      <View style={styles.stepRow}>
        <StepButton icon="remove" label={tm("portionLess")} disabled={multiplier <= MIN} onPress={() => step(-STEP)} />
        <AppText style={styles.portion}>
          {shown}× {food.portion}
        </AppText>
        <StepButton icon="add" label={tm("portionMore")} disabled={multiplier >= MAX} onPress={() => step(STEP)} />
      </View>
      <View style={styles.stepRow}>
        <AppText variant="small" style={styles.grow}>
          {multiplyFood(food, multiplier).calories} kcal
        </AppText>
        <Button label={tf("add")} onPress={() => onAdd(multiplier)} style={styles.addButton} />
      </View>
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: "add" | "remove"; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed && styles.stepPressed, disabled && styles.stepDisabled]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const normalize = (raw: string) => raw.trim().replace(",", ".");

/** A custom food (web: NewUserFoodForm); it then shows under "Mine". */
function NewFoodForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("meals.foodReference");
  const tm = useTranslations("mobile.mealForm");
  const errorMessage = useErrorMessage();
  const create = useCreateUserFood();
  const [name, setName] = useState("");
  const [portion, setPortion] = useState("");
  const [values, setValues] = useState({ calories: "", proteinG: "", carbsG: "", fatG: "" });
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    const calories = normalize(values.calories);
    const decimal = (raw: string) => normalize(raw) || null;
    const parsed = userFoodSchema.safeParse({
      name,
      portion,
      calories: /^\d+$/.test(calories) ? Number(calories) : Number.NaN,
      proteinG: decimal(values.proteinG),
      carbsG: decimal(values.carbsG),
      fatG: decimal(values.fatG),
    });
    if (!parsed.success) return setError(tm("foodInvalid"));
    create.mutate(parsed.data, { onSuccess: onDone, onError: (err) => setError(errorMessage(err)) });
  };

  const number = (key: keyof typeof values, label: string, unit?: string) => (
    <Field label={label}>
      <NumberInput value={values[key]} onChangeText={(v) => setValues((s) => ({ ...s, [key]: v }))} unit={unit} accessibilityLabel={label} />
    </Field>
  );

  return (
    <Card>
      <Input value={name} onChangeText={setName} placeholder={t("namePlaceholder")} maxLength={100} />
      <Input value={portion} onChangeText={setPortion} placeholder={t("portionPlaceholder")} maxLength={50} />
      <View style={styles.formRow}>
        {number("calories", t("caloriesPlaceholder"), "kcal")}
        {number("proteinG", t("proteinPlaceholder"))}
      </View>
      <View style={styles.formRow}>
        {number("carbsG", t("carbsPlaceholder"))}
        {number("fatG", t("fatPlaceholder"))}
      </View>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      <View style={styles.formRow}>
        <Button label={t("cancel")} variant="ghost" onPress={onDone} style={styles.grow} />
        <Button label={t("save")} loading={create.isPending} onPress={save} style={styles.grow} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  selected: { borderColor: colors.primary, borderWidth: 1 },
  rowHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
  name: { fontWeight: "600" },
  stepper: { gap: spacing.sm },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPressed: { backgroundColor: colors.cardPressed },
  stepDisabled: { opacity: 0.4 },
  portion: { flex: 1, textAlign: "center", fontVariant: ["tabular-nums"] },
  addButton: { minWidth: 96 },
  formRow: { flexDirection: "row", gap: spacing.md },
  error: { color: colors.danger, textAlign: "center" },
});
