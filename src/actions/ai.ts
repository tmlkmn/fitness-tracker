"use server";

const mealVariations: Record<string, string[]> = {
  kahvaltı: [
    "Menemen (3 yumurta + domates + biber) + 2 dilim çavdar ekmeği + beyaz peynir",
    "Peynirli omlet (3 yumurta + kaşar + mantar) + 2 dilim tam buğday ekmeği",
    "Shakshuka (2 yumurta + domates sosu + pul biber) + ekmek + zeytin",
    "Yumurtalı avokado toast + 2 haşlanmış yumurta + yeşillik",
    "Yulaf lapası (su ile) + 1 muz + bal + tarçın + 5 badem",
  ],
  "ara öğün": [
    "200g yoğurt + 1 yemek kaşığı bal + chia tohumu + çilek",
    "Ton sandviç (1 kutu ton + marul + domates + tam buğday ekmek)",
    "1 elma + 30g ceviz + 1 bardak ayran",
    "200g lor peyniri + 5 ceviz + 1 armut",
    "Granola + yoğurt + taze meyve",
  ],
  "ana öğün": [
    "150g ızgara tavuk göğsü + 80g bulgur pilavı + mevsim salatası",
    "150g somon fileto + buharda brokoli + yeşil mercimek çorbası",
    "150g hindi göğsü + kinoa salatası + zeytinyağlı fasulye",
    "150g kırmızı et (yağsız) + sebze kavurma + salata",
    "2 adet köfte + ızgara sebze + yarım avokado",
  ],
};

export async function generateMealVariation(mealLabel: string, currentContent: string) {
  const labelLower = mealLabel.toLowerCase();
  let category = "ana öğün";

  if (
    labelLower.includes("kahvaltı") ||
    labelLower.includes("omlet") ||
    labelLower.includes("menemen")
  ) {
    category = "kahvaltı";
  } else if (
    labelLower.includes("ara") ||
    labelLower.includes("atıştırma") ||
    labelLower.includes("snack")
  ) {
    category = "ara öğün";
  }

  const variations = mealVariations[category];
  const filtered = variations.filter((v) => v !== currentContent);
  const suggestion = filtered[Math.floor(Math.random() * filtered.length)];

  return { suggestion };
}
