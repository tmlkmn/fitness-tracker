/**
 * Assertion script for src/lib/macro-engine.ts (the project has no test
 * framework). Pure functions only — no DB, no API.
 *
 *   npx tsx scripts/check-macro-engine.ts
 */

import {
  applyMacroEngine,
  computeMealMacros,
  normalizeFoodName,
  renderMealContent,
  resolveIngredientReference,
  roundGrams,
  scaleDayToTargets,
  type MealIngredient,
} from "@/lib/macro-engine";

let failed = 0;
function check(name: string, ok: boolean, got?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  → ${JSON.stringify(got)}`}`);
  if (!ok) failed++;
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const within = (a: number, target: number, pct: number) => Math.abs(a - target) / target <= pct;

const ing = (over: Partial<MealIngredient> & Pick<MealIngredient, "name" | "grams" | "role">): MealIngredient => ({
  pieceGrams: null,
  kcalPer100g: 100,
  proteinPer100g: 10,
  carbsPer100g: 10,
  fatPer100g: 2,
  ...over,
});

const chicken = ing({ name: "tavuk göğsü", grams: 200, role: "protein", kcalPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 });
const rice = ing({ name: "pirinç pilavı", grams: 200, role: "carb", kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 });
const oil = ing({ name: "zeytinyağı", grams: 10, role: "fat", kcalPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100 });
const salad = ing({ name: "salata", grams: 100, role: "veg", kcalPer100g: 25, proteinPer100g: 1, carbsPer100g: 5, fatPer100g: 0 });
const eggs = ing({ name: "yumurta", grams: 100, pieceGrams: 50, role: "protein", kcalPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 });
const oats = ing({ name: "yulaf", grams: 60, role: "carb", kcalPer100g: 375, proteinPer100g: 13, carbsPer100g: 67, fatPer100g: 7 });

// computeMealMacros
const m = computeMealMacros([ing({ name: "x", grams: 200, role: "other" })]);
check("computeMealMacros scales per-100g by grams", m.calories === 200 && m.protein === 20 && m.carbs === 20 && m.fat === 4, m);
const lunch = computeMealMacros([chicken, rice, oil, salad]);
check("lunch protein = 62 + 5.4 + 1", near(lunch.protein, 68.4, 0.01), lunch);
check("lunch fat = 7.2 + 0.6 + 10", near(lunch.fat, 17.8, 0.01), lunch);

// roundGrams
check("roundGrams <20g → 1g steps", roundGrams(oil, 7.4) === 7);
check("roundGrams ≥20g → 5g steps", roundGrams(rice, 143) === 145);
check("roundGrams pieces → whole pieces", roundGrams(eggs, 130) === 150);
check("roundGrams pieces → at least 1 piece", roundGrams(eggs, 10) === 50);

// scaleDayToTargets — reachable targets land within ±5% (rounding noise)
const day = [[eggs, oats], [chicken, rice, oil, salad]];
const before = computeMealMacros(day.flat());
// Reachable within the portion limits (unreachable targets: see clamping below).
const target = { protein: 110, carbs: 150, fat: 45 };
const scaled = scaleDayToTargets(day, target);
const after = computeMealMacros(scaled.meals.flat());
check("before: day is off target", !within(before.carbs, target.carbs, 0.1), before);
check("protein within ±5%", within(after.protein, target.protein, 0.05), after);
check("carbs within ±5%", within(after.carbs, target.carbs, 0.05), after);
check("fat within ±5%", within(after.fat, target.fat, 0.05), after);
check("veg untouched", scaled.meals[1][3].grams === salad.grams);
check("input not mutated", day[1][1].grams === 200);
check("scaled grams are kitchen amounts", scaled.meals.flat().every((i) => (i.pieceGrams ? i.grams % i.pieceGrams === 0 : i.grams < 20 || i.grams % 5 === 0)));

// clamping — impossible carb target stops at the ×1.6 limit
const greedy = scaleDayToTargets([[chicken, rice]], { carbs: 500 });
check("carb multiplier clamps at 1.6", near(greedy.multipliers.carb, 1.6, 1e-9), greedy.multipliers);
check("carb grams = 200 × 1.6", greedy.meals[0][1].grams === 320, greedy.meals[0][1].grams);

// missing targets → unscaled
const none = scaleDayToTargets(day, {});
check("no targets → multipliers 1", none.multipliers.protein === 1 && none.multipliers.carb === 1 && none.multipliers.fat === 1, none.multipliers);

// carb target derived from kcal when carbs missing
const kcalOnly = scaleDayToTargets(day, { calories: 1450, protein: 110, fat: 45 });
const kcalAfter = computeMealMacros(kcalOnly.meals.flat());
check("kcal-derived carb target lands kcal within ±7%", within(kcalAfter.calories, 1450, 0.07), kcalAfter);

// reference correction
const warnings: string[] = [];
const wrong = ing({ name: "Chicken breast (grilled)", grams: 150, role: "protein", kcalPer100g: 300, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 });
const fixed = resolveIngredientReference(wrong, "meal[0]", warnings);
check("far-off kcal → DB row used", fixed.kcalPer100g === 165 && warnings.length === 1, { fixed, warnings });
const close = resolveIngredientReference({ ...wrong, kcalPer100g: 170 }, "meal[0]", warnings);
check("close kcal → model value kept", close.kcalPer100g === 170 && warnings.length === 1);
const leanCut = resolveIngredientReference(ing({ name: "dana bonfile (ızgara, pişmiş)", grams: 200, role: "protein", kcalPer100g: 190, proteinPer100g: 29, carbsPer100g: 0, fatPer100g: 8 }), "meal[3]", warnings);
check("specific cut ~30% under a generic DB row → model value kept", leanCut.kcalPer100g === 190 && warnings.length === 1, leanCut);
const inconsistent = resolveIngredientReference(ing({ name: "bilinmeyen", grams: 100, role: "other", kcalPer100g: 500, proteinPer100g: 10, carbsPer100g: 10, fatPer100g: 0 }), "m", warnings);
check("unknown food with inconsistent kcal → Atwater", inconsistent.kcalPer100g === 80, inconsistent.kcalPer100g);

// names + rendering
check("normalizeFoodName folds TR + drops qualifiers", normalizeFoodName("Tavuk Göğsü (ızgara)") === "tavuk gogsu", normalizeFoodName("Tavuk Göğsü (ızgara)"));
const text = renderMealContent([eggs, oats], "Yulafı sütle pişir.", "tr");
check("render TR", text === "100g yumurta (2 adet), 60g yulaf — Yulafı sütle pişir.", text);
check("render EN pieces + no note", renderMealContent([eggs], "", "en") === "100g yumurta (2 pc)");

// recipe templates — scaled amounts go into the model's own prose
const bread = ing({ name: "tam buğday ekmek", grams: 60, pieceGrams: 30, role: "carb" });
check(
  "template fills grams + piece counts",
  renderMealContent([eggs, oats, bread], "{0} yumurtayı {1} yulafla pişir, yanına {2} dilim ekmek ekle.", "tr") ===
    "2 yumurtayı 60g yulafla pişir, yanına 2 dilim ekmek ekle.",
  renderMealContent([eggs, oats, bread], "{0} yumurtayı {1} yulafla pişir, yanına {2} dilim ekmek ekle.", "tr"),
);
check(
  "template missing an ingredient → list fallback, placeholders stripped",
  renderMealContent([eggs, oats], "{0} yumurtayı haşla.", "tr") === "100g yumurta (2 adet), 60g yulaf — yumurtayı haşla.",
  renderMealContent([eggs, oats], "{0} yumurtayı haşla.", "tr"),
);
check(
  "template with out-of-range index → list fallback",
  renderMealContent([eggs], "{0} yumurta ve {3} peynir", "tr").startsWith("100g yumurta (2 adet) — "),
  renderMealContent([eggs], "{0} yumurta ve {3} peynir", "tr"),
);
check("multi-line recipe collapsed to one line", !renderMealContent([oats], "{0} yulafı\nsütle pişir", "tr").includes("\n"));

// applyMacroEngine — the day pipeline the daily meal flow uses
const asRaw = (i: MealIngredient) => ({ ...i });
const engineWarnings: string[] = [];
const out = applyMacroEngine(
  [
    { mealTime: "08:00", mealLabel: "Kahvaltı", note: "Yulafı sütle pişir.", ingredients: [eggs, oats].map(asRaw) },
    { mealTime: "13:00", mealLabel: "Öğle Yemeği", note: "", ingredients: [chicken, rice, oil, salad].map(asRaw) },
    // No ingredients → passes through with the model's own macros.
    { mealTime: "16:00", mealLabel: "Ara Öğün", content: "1 elma", calories: 95, proteinG: 0, carbsG: 25, fatG: 0 },
  ],
  { protein: 110, carbs: 175, fat: 45 },
  "tr",
  engineWarnings,
);
const dayTotals = out.reduce<{ protein: number; carbs: number; fat: number }>(
  (a, m) => ({
    protein: a.protein + Number(m.proteinG),
    carbs: a.carbs + Number(m.carbsG),
    fat: a.fat + Number(m.fatG),
  }),
  { protein: 0, carbs: 0, fat: 0 },
);
check("engine day protein within ±5%", within(dayTotals.protein, 110, 0.05), dayTotals);
check("engine day carbs within ±5%", within(dayTotals.carbs, 175, 0.05), dayTotals);
check("engine day fat within ±5%", within(dayTotals.fat, 45, 0.05), dayTotals);
check("engine renders content from ingredients", String(out[0].content).startsWith("100g yumurta"), out[0].content);
check("passthrough meal kept verbatim", out[2].content === "1 elma" && out[2].calories === 95, out[2]);
check("fallback + scaled telemetry emitted", engineWarnings.some((w) => w.startsWith("[engine-fallback]")) && engineWarnings.some((w) => w.startsWith("[engine-scaled]")), engineWarnings);

const bad: string[] = [];
const dropped = applyMacroEngine(
  [{ mealTime: "08:00", mealLabel: "Kahvaltı", note: "", ingredients: [{ name: "x", grams: -5 }, asRaw(oats)] }],
  undefined,
  "tr",
  bad,
);
check("invalid ingredient dropped, rest computed", bad.some((w) => w.startsWith("[engine-ingredient-dropped]")) && dropped[0].calories === 225, { bad, dropped });

console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
