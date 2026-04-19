export interface TurkishFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: "protein" | "karbonhidrat" | "yag" | "sebze_meyve" | "sut_urunleri";
}

export const CATEGORY_LABELS: Record<TurkishFood["category"], string> = {
  protein: "Protein",
  karbonhidrat: "Karbonhidrat",
  yag: "Yağ",
  sebze_meyve: "Sebze & Meyve",
  sut_urunleri: "Süt Ürünleri",
};

export const TURKISH_FOODS: TurkishFood[] = [
  // Protein
  { name: "Tavuk göğsü (ızgara)", portion: "100g", calories: 165, protein: 31, carbs: 0, fat: 3.6, category: "protein" },
  { name: "Tavuk but (ızgara)", portion: "100g", calories: 209, protein: 26, carbs: 0, fat: 11, category: "protein" },
  { name: "Dana kıyma (yağsız)", portion: "100g", calories: 176, protein: 20, carbs: 0, fat: 10, category: "protein" },
  { name: "Dana bonfile (ızgara)", portion: "100g", calories: 271, protein: 26, carbs: 0, fat: 18, category: "protein" },
  { name: "Kuzu pirzola (ızgara)", portion: "100g", calories: 294, protein: 25, carbs: 0, fat: 21, category: "protein" },
  { name: "Somon (ızgara)", portion: "100g", calories: 208, protein: 20, carbs: 0, fat: 13, category: "protein" },
  { name: "Levrek (ızgara)", portion: "100g", calories: 124, protein: 24, carbs: 0, fat: 3, category: "protein" },
  { name: "Ton balığı (konserve)", portion: "100g", calories: 116, protein: 26, carbs: 0, fat: 1, category: "protein" },
  { name: "Yumurta (haşlanmış)", portion: "1 adet", calories: 78, protein: 6, carbs: 1, fat: 5, category: "protein" },
  { name: "Yumurta beyazı", portion: "1 adet", calories: 17, protein: 4, carbs: 0, fat: 0, category: "protein" },
  { name: "Hindi göğsü", portion: "100g", calories: 135, protein: 30, carbs: 0, fat: 1, category: "protein" },
  { name: "Karides", portion: "100g", calories: 99, protein: 24, carbs: 0, fat: 0.3, category: "protein" },
  { name: "Kuru fasulye (pişmiş)", portion: "1 kase", calories: 225, protein: 15, carbs: 40, fat: 1, category: "protein" },
  { name: "Mercimek (pişmiş)", portion: "1 kase", calories: 230, protein: 18, carbs: 40, fat: 1, category: "protein" },
  { name: "Nohut (pişmiş)", portion: "1 kase", calories: 269, protein: 15, carbs: 45, fat: 4, category: "protein" },

  // Karbonhidrat
  { name: "Pirinç pilavı", portion: "1 porsiyon", calories: 206, protein: 4, carbs: 45, fat: 0.4, category: "karbonhidrat" },
  { name: "Bulgur pilavı", portion: "1 porsiyon", calories: 180, protein: 6, carbs: 34, fat: 2, category: "karbonhidrat" },
  { name: "Makarna (pişmiş)", portion: "1 porsiyon", calories: 220, protein: 8, carbs: 43, fat: 1, category: "karbonhidrat" },
  { name: "Tam buğday ekmeği", portion: "1 dilim", calories: 69, protein: 3.5, carbs: 12, fat: 1, category: "karbonhidrat" },
  { name: "Beyaz ekmek", portion: "1 dilim", calories: 79, protein: 3, carbs: 15, fat: 1, category: "karbonhidrat" },
  { name: "Yulaf ezmesi", portion: "40g (kuru)", calories: 150, protein: 5, carbs: 27, fat: 3, category: "karbonhidrat" },
  { name: "Patates (haşlanmış)", portion: "1 orta", calories: 130, protein: 3, carbs: 30, fat: 0, category: "karbonhidrat" },
  { name: "Tatlı patates (fırın)", portion: "1 orta", calories: 103, protein: 2, carbs: 24, fat: 0, category: "karbonhidrat" },
  { name: "Kinoa (pişmiş)", portion: "1 porsiyon", calories: 222, protein: 8, carbs: 39, fat: 4, category: "karbonhidrat" },
  { name: "Muz", portion: "1 orta", calories: 105, protein: 1, carbs: 27, fat: 0, category: "karbonhidrat" },
  { name: "Bal", portion: "1 yemek kaşığı", calories: 64, protein: 0, carbs: 17, fat: 0, category: "karbonhidrat" },
  { name: "Pekmez", portion: "1 yemek kaşığı", calories: 55, protein: 0, carbs: 14, fat: 0, category: "karbonhidrat" },
  { name: "Pirinç patlağı", portion: "30g", calories: 117, protein: 2, carbs: 26, fat: 0.3, category: "karbonhidrat" },

  // Yağ
  { name: "Zeytinyağı", portion: "1 yemek kaşığı", calories: 119, protein: 0, carbs: 0, fat: 14, category: "yag" },
  { name: "Tereyağı", portion: "1 yemek kaşığı", calories: 102, protein: 0, carbs: 0, fat: 12, category: "yag" },
  { name: "Badem", portion: "30g (23 adet)", calories: 164, protein: 6, carbs: 6, fat: 14, category: "yag" },
  { name: "Ceviz", portion: "30g (7 yarım)", calories: 185, protein: 4, carbs: 4, fat: 18, category: "yag" },
  { name: "Fındık", portion: "30g", calories: 178, protein: 4, carbs: 5, fat: 17, category: "yag" },
  { name: "Fıstık ezmesi", portion: "1 yemek kaşığı", calories: 94, protein: 4, carbs: 3, fat: 8, category: "yag" },
  { name: "Avokado", portion: "yarım", calories: 161, protein: 2, carbs: 9, fat: 15, category: "yag" },
  { name: "Zeytin (siyah)", portion: "10 adet", calories: 50, protein: 0, carbs: 2, fat: 5, category: "yag" },
  { name: "Keten tohumu", portion: "1 yemek kaşığı", calories: 55, protein: 2, carbs: 3, fat: 4, category: "yag" },
  { name: "Chia tohumu", portion: "1 yemek kaşığı", calories: 58, protein: 2, carbs: 5, fat: 4, category: "yag" },

  // Sebze & Meyve
  { name: "Domates", portion: "1 orta", calories: 22, protein: 1, carbs: 5, fat: 0, category: "sebze_meyve" },
  { name: "Salatalık", portion: "1 orta", calories: 16, protein: 1, carbs: 4, fat: 0, category: "sebze_meyve" },
  { name: "Brokoli (haşlanmış)", portion: "1 kase", calories: 55, protein: 4, carbs: 11, fat: 1, category: "sebze_meyve" },
  { name: "Ispanak (pişmiş)", portion: "1 kase", calories: 41, protein: 5, carbs: 7, fat: 0, category: "sebze_meyve" },
  { name: "Karışık salata", portion: "1 tabak", calories: 35, protein: 2, carbs: 7, fat: 0, category: "sebze_meyve" },
  { name: "Biber (sivri)", portion: "1 adet", calories: 10, protein: 0, carbs: 2, fat: 0, category: "sebze_meyve" },
  { name: "Havuç", portion: "1 orta", calories: 25, protein: 1, carbs: 6, fat: 0, category: "sebze_meyve" },
  { name: "Elma", portion: "1 orta", calories: 95, protein: 0, carbs: 25, fat: 0, category: "sebze_meyve" },
  { name: "Portakal", portion: "1 orta", calories: 62, protein: 1, carbs: 15, fat: 0, category: "sebze_meyve" },
  { name: "Çilek", portion: "1 kase", calories: 49, protein: 1, carbs: 12, fat: 0, category: "sebze_meyve" },
  { name: "Karpuz", portion: "1 dilim", calories: 86, protein: 2, carbs: 22, fat: 0, category: "sebze_meyve" },
  { name: "Üzüm", portion: "1 kase", calories: 104, protein: 1, carbs: 27, fat: 0, category: "sebze_meyve" },
  { name: "Hurma", portion: "2 adet", calories: 133, protein: 1, carbs: 36, fat: 0, category: "sebze_meyve" },

  // Süt Ürünleri
  { name: "Süt (yarım yağlı)", portion: "1 bardak", calories: 122, protein: 8, carbs: 12, fat: 5, category: "sut_urunleri" },
  { name: "Süt (tam yağlı)", portion: "1 bardak", calories: 149, protein: 8, carbs: 12, fat: 8, category: "sut_urunleri" },
  { name: "Yoğurt (yarım yağlı)", portion: "1 kase", calories: 110, protein: 8, carbs: 12, fat: 4, category: "sut_urunleri" },
  { name: "Süzme yoğurt", portion: "1 kase", calories: 100, protein: 17, carbs: 6, fat: 1, category: "sut_urunleri" },
  { name: "Lor peyniri", portion: "100g", calories: 98, protein: 11, carbs: 3, fat: 4, category: "sut_urunleri" },
  { name: "Beyaz peynir", portion: "30g", calories: 80, protein: 5, carbs: 1, fat: 6, category: "sut_urunleri" },
  { name: "Kaşar peyniri", portion: "30g", calories: 113, protein: 7, carbs: 0, fat: 9, category: "sut_urunleri" },
  { name: "Taze kaşar", portion: "30g", calories: 100, protein: 7, carbs: 1, fat: 8, category: "sut_urunleri" },
  { name: "Ayran", portion: "1 bardak", calories: 66, protein: 3, carbs: 5, fat: 4, category: "sut_urunleri" },
  { name: "Kefir", portion: "1 bardak", calories: 110, protein: 11, carbs: 12, fat: 2, category: "sut_urunleri" },
  { name: "Labne", portion: "1 yemek kaşığı", calories: 50, protein: 2, carbs: 1, fat: 4, category: "sut_urunleri" },
  { name: "Protein tozu (whey)", portion: "1 ölçek (30g)", calories: 120, protein: 24, carbs: 3, fat: 1, category: "sut_urunleri" },
];
