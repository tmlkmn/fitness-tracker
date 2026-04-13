import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

type NewMeal = typeof schema.meals.$inferInsert;
type NewExercise = typeof schema.exercises.$inferInsert;

// ──────────────────────────────────────────────────────────────────────────────
// MEAL DATA GENERATORS
// ──────────────────────────────────────────────────────────────────────────────

// Workout day meals — varied per day of week
function workoutDayMeals(
  dailyPlanId: number,
  dayOfWeek: number,
  weekNumber: number
): Omit<NewMeal, "id">[] {
  const breakfasts = [
    "Menemen (3 yumurta + domates + biber + yeşillik) + 2 dilim çavdar ekmeği + beyaz peynir",
    "Peynirli omlet (3 yumurta + kaşar + mantar) + 2 dilim tam buğday ekmeği + zeytin",
    "Shakshuka (2 yumurta + domates sosu + pul biber) + ekmek + yeşillik + zeytin",
    "Yumurtalı avokado toast (2 yumurta + avokado + limon) + 1 dilim tam buğday ekmeği",
    "Sebzeli omlet (3 yumurta + ıspanak + mantar + peynir) + tam buğday ekmek",
  ];

  const lunchSnacks = [
    "200g yoğurt + 1 yemek kaşığı bal + chia tohumu + çilek",
    "Ton sandviç (1 kutu ton + marul + domates + tam buğday ekmek)",
    "1 elma + 30g ceviz + 1 bardak ayran",
    "200g lor peyniri + 5 ceviz + 1 armut",
    "Granola (40g) + yoğurt + taze meyve + bal",
  ];

  const mainMeals = [
    "150g ızgara tavuk göğsü + 80g bulgur pilavı + mevsim salatası",
    "150g somon fileto + buharda brokoli + mercimek çorbası",
    "150g hindi göğsü + kinoa salatası + zeytinyağlı fasulye",
    "150g ızgara tavuk + makarna (tam buğday) + domates sosu",
    "Ton balıklı salata + 2 haşlanmış yumurta + avokado + tam buğday ekmek",
  ];

  const idx = dayOfWeek % 5;

  const postWorkout =
    weekNumber <= 2
      ? "2 haşlanmış yumurta + 1 dilim çavdar ekmeği + 1 bardak ayran"
      : "1 kepçe whey protein (SU ile) + 1 muz";

  return [
    {
      dailyPlanId,
      mealTime: "08:45",
      mealLabel: "🚗 Yolda Dozu",
      content: "1 muz + 10 badem (önceden hazır küçük poşet)",
      calories: 200,
      proteinG: "5",
      carbsG: "30",
      fatG: "7",
      isCompleted: false,
      sortOrder: 1,
    },
    {
      dailyPlanId,
      mealTime: "10:00",
      mealLabel: "☕ Toplantı Arası",
      content: "Sade kahve + 1 avuç ceviz (30g)",
      calories: 220,
      proteinG: "5",
      carbsG: "5",
      fatG: "18",
      isCompleted: false,
      sortOrder: 2,
    },
    {
      dailyPlanId,
      mealTime: "11:00",
      mealLabel: "🍳 Kahvaltı",
      content: breakfasts[idx],
      calories: 550,
      proteinG: "35",
      carbsG: "40",
      fatG: "20",
      isCompleted: false,
      sortOrder: 3,
    },
    {
      dailyPlanId,
      mealTime: "14:00",
      mealLabel: "🥗 Ara Öğün",
      content: lunchSnacks[idx],
      calories: 250,
      proteinG: "15",
      carbsG: "25",
      fatG: "8",
      isCompleted: false,
      sortOrder: 4,
    },
    {
      dailyPlanId,
      mealTime: "17:00",
      mealLabel: "🍗 Ana Öğün",
      content: mainMeals[idx],
      calories: 500,
      proteinG: "45",
      carbsG: "45",
      fatG: "12",
      isCompleted: false,
      sortOrder: 5,
    },
    {
      dailyPlanId,
      mealTime: "18:15",
      mealLabel: "⚡ Antrenman Öncesi",
      content: "1 muz + 1 yemek kaşığı bal + birkaç yudum su",
      calories: 200,
      proteinG: "2",
      carbsG: "48",
      fatG: "1",
      isCompleted: false,
      sortOrder: 6,
    },
    {
      dailyPlanId,
      mealTime: "21:00",
      mealLabel: "💪 Antrenman Sonrası",
      content: postWorkout,
      calories: 300,
      proteinG: "30",
      carbsG: "25",
      fatG: "5",
      isCompleted: false,
      sortOrder: 7,
    },
    {
      dailyPlanId,
      mealTime: "22:15",
      mealLabel: "🌙 Gece",
      content: "150g lor peyniri + 5 ceviz",
      calories: 200,
      proteinG: "20",
      carbsG: "5",
      fatG: "12",
      isCompleted: false,
      sortOrder: 8,
    },
  ];
}

// Off/Swimming day meals
function offDayMeals(
  dailyPlanId: number,
  dayOfWeek: number
): Omit<NewMeal, "id">[] {
  const breakfasts = [
    "Yulaf lapası (SU ile, 60g) + 2 haşlanmış yumurta + 1 elma",
    "Yulaf lapası (SU ile) + muz + bal + tarçın + 5 badem",
    "2 haşlanmış yumurta + avokado + tam buğday ekmek (2 dilim)",
    "Yulaf lapası (SU ile) + yoğurt + granola + çilek",
  ];
  const mainMeals = [
    "150g somon fileto + buharda brokoli + mercimek çorbası",
    "150g tavuk + kinoa + zeytinyağlı sebze",
    "Hindi eti + sebze çorbası + salata",
    "Ton balıklı kinoa salatası + zeytin + domates",
  ];
  const idx = dayOfWeek % 4;

  return [
    {
      dailyPlanId,
      mealTime: "08:45",
      mealLabel: "🚗 Yolda",
      content: "1 elma + 8 badem",
      calories: 180,
      proteinG: "4",
      carbsG: "28",
      fatG: "6",
      isCompleted: false,
      sortOrder: 1,
    },
    {
      dailyPlanId,
      mealTime: "10:00",
      mealLabel: "☕ Toplantı",
      content: "Yeşil çay + 3 hurma + 5 fındık",
      calories: 200,
      proteinG: "3",
      carbsG: "35",
      fatG: "5",
      isCompleted: false,
      sortOrder: 2,
    },
    {
      dailyPlanId,
      mealTime: "11:00",
      mealLabel: "🍳 Kahvaltı",
      content: breakfasts[idx],
      calories: 450,
      proteinG: "25",
      carbsG: "55",
      fatG: "10",
      isCompleted: false,
      sortOrder: 3,
    },
    {
      dailyPlanId,
      mealTime: "14:00",
      mealLabel: "🥗 Ara",
      content: "Ton balıklı sandviç (1 kutu ton + marul + domates + tam buğday ekmek)",
      calories: 350,
      proteinG: "30",
      carbsG: "35",
      fatG: "8",
      isCompleted: false,
      sortOrder: 4,
    },
    {
      dailyPlanId,
      mealTime: "17:00",
      mealLabel: "🍗 Ana Öğün",
      content: mainMeals[idx],
      calories: 500,
      proteinG: "40",
      carbsG: "40",
      fatG: "14",
      isCompleted: false,
      sortOrder: 5,
    },
    {
      dailyPlanId,
      mealTime: "20:00",
      mealLabel: "🌙 Akşam",
      content: "200g yoğurt + 5 ceviz + 1 elma",
      calories: 250,
      proteinG: "10",
      carbsG: "30",
      fatG: "10",
      isCompleted: false,
      sortOrder: 6,
    },
  ];
}

// Rest day meals
function restDayMeals(dailyPlanId: number): Omit<NewMeal, "id">[] {
  return [
    {
      dailyPlanId,
      mealTime: "10:00",
      mealLabel: "🍳 Geç Kahvaltı",
      content: "Yulaf lapası (SU ile) + 2 haşlanmış yumurta + 1 muz + bal",
      calories: 500,
      proteinG: "25",
      carbsG: "70",
      fatG: "10",
      isCompleted: false,
      sortOrder: 1,
    },
    {
      dailyPlanId,
      mealTime: "14:00",
      mealLabel: "🥗 Öğle",
      content: "150g ızgara tavuk + sebze salatası + 1 dilim ekmek",
      calories: 400,
      proteinG: "40",
      carbsG: "25",
      fatG: "10",
      isCompleted: false,
      sortOrder: 2,
    },
    {
      dailyPlanId,
      mealTime: "17:00",
      mealLabel: "☕ İkindi",
      content: "200g yoğurt + bal + 1 avuç karma kuruyemiş",
      calories: 300,
      proteinG: "12",
      carbsG: "35",
      fatG: "12",
      isCompleted: false,
      sortOrder: 3,
    },
    {
      dailyPlanId,
      mealTime: "20:00",
      mealLabel: "🌙 Akşam",
      content: "150g somon + buharda sebze + mercimek çorbası",
      calories: 500,
      proteinG: "40",
      carbsG: "35",
      fatG: "15",
      isCompleted: false,
      sortOrder: 4,
    },
    {
      dailyPlanId,
      mealTime: "22:00",
      mealLabel: "🌃 Gece Atıştırması",
      content: "150g lor peyniri + 1 avuç ceviz",
      calories: 200,
      proteinG: "20",
      carbsG: "5",
      fatG: "12",
      isCompleted: false,
      sortOrder: 5,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// EXERCISE DATA
// ──────────────────────────────────────────────────────────────────────────────

// Full Body A exercises (Hafta 1-2 Pazartesi / Çarşamba / Cuma)
function fullBodyExercises(
  dailyPlanId: number,
  variant: "A" | "B" | "C"
): Omit<NewExercise, "id">[] {
  const mainExercises: Record<string, Omit<NewExercise, "id">[]> = {
    A: [
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Flat Dumbbell Bench Press",
        sets: 3,
        reps: "12-15",
        restSeconds: 90,
        notes: null,
        isCompleted: false,
        sortOrder: 10,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Lat Pulldown",
        sets: 3,
        reps: "12-15",
        restSeconds: 90,
        notes: null,
        isCompleted: false,
        sortOrder: 11,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Dumbbell Shoulder Press",
        sets: 3,
        reps: "12",
        restSeconds: 75,
        notes: null,
        isCompleted: false,
        sortOrder: 12,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Cable Row",
        sets: 3,
        reps: "12-15",
        restSeconds: 75,
        notes: null,
        isCompleted: false,
        sortOrder: 13,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Leg Press (Yarım ROM)",
        sets: 3,
        reps: "15",
        restSeconds: 90,
        notes: "🦵 Menisküs: Tam ROM yapma! Yarı mesafede dur",
        isCompleted: false,
        sortOrder: 14,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Lying Leg Curl",
        sets: 3,
        reps: "15",
        restSeconds: 60,
        notes: null,
        isCompleted: false,
        sortOrder: 15,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Tricep Pushdown",
        sets: 2,
        reps: "15",
        restSeconds: 60,
        notes: null,
        isCompleted: false,
        sortOrder: 16,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Hammer Curl",
        sets: 2,
        reps: "15",
        restSeconds: 60,
        notes: null,
        isCompleted: false,
        sortOrder: 17,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Plank",
        sets: 3,
        reps: "20-30sn",
        restSeconds: 45,
        notes: null,
        isCompleted: false,
        sortOrder: 18,
      },
    ],
    B: [
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Incline Dumbbell Press",
        sets: 3,
        reps: "12",
        restSeconds: 90,
        notes: null,
        isCompleted: false,
        sortOrder: 10,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Seated Cable Row",
        sets: 3,
        reps: "12-15",
        restSeconds: 90,
        notes: null,
        isCompleted: false,
        sortOrder: 11,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Lateral Raise",
        sets: 3,
        reps: "15",
        restSeconds: 60,
        notes: null,
        isCompleted: false,
        sortOrder: 12,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Machine Chest Press",
        sets: 3,
        reps: "12",
        restSeconds: 75,
        notes: null,
        isCompleted: false,
        sortOrder: 13,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Leg Extension",
        sets: 3,
        reps: "15",
        restSeconds: 75,
        notes: "🦵 Menisküs: Ağırlığı hafif tut, kontrollü yap",
        isCompleted: false,
        sortOrder: 14,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Romanian Deadlift (Hafif)",
        sets: 3,
        reps: "12",
        restSeconds: 75,
        notes: "🦵 Ağırlığı kademeli artır",
        isCompleted: false,
        sortOrder: 15,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "EZ Bar Curl",
        sets: 3,
        reps: "12-15",
        restSeconds: 60,
        notes: null,
        isCompleted: false,
        sortOrder: 16,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Overhead Tricep Extension",
        sets: 2,
        reps: "15",
        restSeconds: 60,
        notes: null,
        isCompleted: false,
        sortOrder: 17,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Ab Crunch (Makine)",
        sets: 3,
        reps: "15-20",
        restSeconds: 45,
        notes: null,
        isCompleted: false,
        sortOrder: 18,
      },
    ],
    C: [
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Cable Fly",
        sets: 3,
        reps: "12-15",
        restSeconds: 75,
        notes: null,
        isCompleted: false,
        sortOrder: 10,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Machine Row",
        sets: 3,
        reps: "12-15",
        restSeconds: 75,
        notes: null,
        isCompleted: false,
        sortOrder: 11,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Arnold Press",
        sets: 3,
        reps: "12",
        restSeconds: 75,
        notes: null,
        isCompleted: false,
        sortOrder: 12,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Leg Press (Yarım ROM)",
        sets: 4,
        reps: "15",
        restSeconds: 90,
        notes: "🦵 Menisküs: Yavaş ve kontrollü",
        isCompleted: false,
        sortOrder: 13,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Leg Curl",
        sets: 3,
        reps: "15",
        restSeconds: 60,
        notes: null,
        isCompleted: false,
        sortOrder: 14,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Dumbbell Curl",
        sets: 3,
        reps: "12",
        restSeconds: 60,
        notes: null,
        isCompleted: false,
        sortOrder: 15,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Dips (makine destekli)",
        sets: 3,
        reps: "12",
        restSeconds: 60,
        notes: null,
        isCompleted: false,
        sortOrder: 16,
      },
      {
        dailyPlanId,
        section: "main",
        sectionLabel: "ANA ANTRENMAN",
        name: "Dead Bug",
        sets: 3,
        reps: "10",
        restSeconds: 45,
        notes: null,
        isCompleted: false,
        sortOrder: 17,
      },
    ],
  };

  const warmup: Omit<NewExercise, "id">[] = [
    {
      dailyPlanId,
      section: "warmup",
      sectionLabel: "ISINMA",
      name: "Eliptik",
      durationMinutes: 5,
      notes: "Orta tempo",
      isCompleted: false,
      sortOrder: 1,
    },
    {
      dailyPlanId,
      section: "warmup",
      sectionLabel: "ISINMA",
      name: "Kol çevirme",
      sets: 2,
      reps: "15",
      notes: null,
      isCompleted: false,
      sortOrder: 2,
    },
    {
      dailyPlanId,
      section: "warmup",
      sectionLabel: "ISINMA",
      name: "Band Pull-Apart",
      sets: 2,
      reps: "15",
      notes: null,
      isCompleted: false,
      sortOrder: 3,
    },
    {
      dailyPlanId,
      section: "warmup",
      sectionLabel: "ISINMA",
      name: "Yarım Squat (Hafif ROM)",
      sets: 2,
      reps: "10",
      notes: "🦵 Sadece çeyrek çömeliş",
      isCompleted: false,
      sortOrder: 4,
    },
    {
      dailyPlanId,
      section: "warmup",
      sectionLabel: "ISINMA",
      name: "Cat-Cow",
      sets: 1,
      reps: "10",
      notes: null,
      isCompleted: false,
      sortOrder: 5,
    },
    {
      dailyPlanId,
      section: "warmup",
      sectionLabel: "ISINMA",
      name: "Dead Bug",
      sets: 1,
      reps: "10",
      notes: null,
      isCompleted: false,
      sortOrder: 6,
    },
  ];

  const cooldown: Omit<NewExercise, "id">[] = [
    {
      dailyPlanId,
      section: "cooldown",
      sectionLabel: "SOĞUMA",
      name: "Eliptik (yavaş)",
      durationMinutes: 5,
      notes: null,
      isCompleted: false,
      sortOrder: 30,
    },
    {
      dailyPlanId,
      section: "cooldown",
      sectionLabel: "SOĞUMA",
      name: "Hamstring Germe",
      sets: 2,
      reps: "20sn",
      notes: null,
      isCompleted: false,
      sortOrder: 31,
    },
    {
      dailyPlanId,
      section: "cooldown",
      sectionLabel: "SOĞUMA",
      name: "Quad Germe",
      sets: 2,
      reps: "20sn",
      notes: "🦵 Denge için duvara tutun",
      isCompleted: false,
      sortOrder: 32,
    },
    {
      dailyPlanId,
      section: "cooldown",
      sectionLabel: "SOĞUMA",
      name: "Göğüs Germe",
      sets: 2,
      reps: "20sn",
      notes: null,
      isCompleted: false,
      sortOrder: 33,
    },
    {
      dailyPlanId,
      section: "cooldown",
      sectionLabel: "SOĞUMA",
      name: "Child Pose",
      sets: 1,
      reps: "30sn",
      notes: null,
      isCompleted: false,
      sortOrder: 34,
    },
  ];

  const sauna: Omit<NewExercise, "id">[] = [
    {
      dailyPlanId,
      section: "sauna",
      sectionLabel: "SAUNA",
      name: "Sauna",
      durationMinutes: 10,
      notes: "Bol su iç öncesinde",
      isCompleted: false,
      sortOrder: 40,
    },
  ];

  return [
    ...warmup,
    ...mainExercises[variant],
    ...cooldown,
    ...sauna,
  ];
}

// Swimming exercises
function swimmingExercises(
  dailyPlanId: number
): Omit<NewExercise, "id">[] {
  return [
    {
      dailyPlanId,
      section: "warmup",
      sectionLabel: "ISINMA",
      name: "Yavaş Serbest Yüzme",
      durationMinutes: 5,
      notes: "Çok yavaş tempo",
      isCompleted: false,
      sortOrder: 1,
    },
    {
      dailyPlanId,
      section: "swimming",
      sectionLabel: "ANA YÜZME",
      name: "25m Serbest Stil",
      sets: 5,
      reps: "25m",
      restSeconds: 30,
      notes: "Molalı, zorlamadan",
      isCompleted: false,
      sortOrder: 10,
    },
    {
      dailyPlanId,
      section: "swimming",
      sectionLabel: "ANA YÜZME",
      name: "25m Sırt Üstü",
      sets: 4,
      reps: "25m",
      restSeconds: 30,
      notes: "🦵 Sırt üstü dize baskı azaltır",
      isCompleted: false,
      sortOrder: 11,
    },
    {
      dailyPlanId,
      section: "cooldown",
      sectionLabel: "SOĞUMA",
      name: "Suda Yürüme",
      durationMinutes: 5,
      notes: null,
      isCompleted: false,
      sortOrder: 30,
    },
    {
      dailyPlanId,
      section: "sauna",
      sectionLabel: "BUHAR ODASI",
      name: "Buhar Odası",
      durationMinutes: 10,
      notes: "Eklemlere iyi gelir",
      isCompleted: false,
      sortOrder: 40,
    },
  ];
}

// Split exercises for Week 3-4
function splitExercises(
  dailyPlanId: number,
  splitType: string
): Omit<NewExercise, "id">[] {
  const warmup: Omit<NewExercise, "id">[] = [
    {
      dailyPlanId,
      section: "warmup",
      sectionLabel: "ISINMA",
      name: "Eliptik",
      durationMinutes: 5,
      notes: null,
      isCompleted: false,
      sortOrder: 1,
    },
    {
      dailyPlanId,
      section: "warmup",
      sectionLabel: "ISINMA",
      name: "Dinamik Germe",
      durationMinutes: 3,
      notes: "Antrenman bölgesine odaklan",
      isCompleted: false,
      sortOrder: 2,
    },
  ];

  const cooldown: Omit<NewExercise, "id">[] = [
    {
      dailyPlanId,
      section: "cooldown",
      sectionLabel: "SOĞUMA",
      name: "Statik Germe",
      durationMinutes: 5,
      notes: null,
      isCompleted: false,
      sortOrder: 30,
    },
    {
      dailyPlanId,
      section: "sauna",
      sectionLabel: "SAUNA",
      name: "Sauna",
      durationMinutes: 10,
      notes: null,
      isCompleted: false,
      sortOrder: 40,
    },
  ];

  const splitMap: Record<string, Omit<NewExercise, "id">[]> = {
    "chest-tricep": [
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Flat Dumbbell Bench Press", sets: 4, reps: "10-12", restSeconds: 90, notes: null, isCompleted: false, sortOrder: 10 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Incline Dumbbell Press", sets: 3, reps: "10-12", restSeconds: 90, notes: null, isCompleted: false, sortOrder: 11 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Cable Fly", sets: 3, reps: "12-15", restSeconds: 75, notes: null, isCompleted: false, sortOrder: 12 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Machine Chest Press", sets: 3, reps: "12", restSeconds: 75, notes: null, isCompleted: false, sortOrder: 13 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Tricep Pushdown", sets: 3, reps: "12-15", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 14 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Skull Crusher", sets: 3, reps: "12", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 15 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Overhead Tricep Extension", sets: 2, reps: "15", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 16 },
    ],
    "back-bicep": [
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Lat Pulldown (Geniş Tutuş)", sets: 4, reps: "10-12", restSeconds: 90, notes: null, isCompleted: false, sortOrder: 10 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Seated Cable Row", sets: 4, reps: "10-12", restSeconds: 90, notes: null, isCompleted: false, sortOrder: 11 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Machine Row", sets: 3, reps: "12", restSeconds: 75, notes: null, isCompleted: false, sortOrder: 12 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Lat Pulldown (Dar Tutuş)", sets: 3, reps: "12-15", restSeconds: 75, notes: null, isCompleted: false, sortOrder: 13 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "EZ Bar Curl", sets: 3, reps: "10-12", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 14 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Hammer Curl", sets: 3, reps: "12", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 15 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Concentration Curl", sets: 2, reps: "12", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 16 },
    ],
    "shoulder-abs": [
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Dumbbell Shoulder Press", sets: 4, reps: "10-12", restSeconds: 90, notes: null, isCompleted: false, sortOrder: 10 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Lateral Raise", sets: 4, reps: "12-15", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 11 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Front Raise", sets: 3, reps: "12", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 12 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Reverse Fly", sets: 3, reps: "15", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 13 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Plank", sets: 4, reps: "30sn", restSeconds: 45, notes: null, isCompleted: false, sortOrder: 14 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Dead Bug", sets: 3, reps: "10", restSeconds: 45, notes: null, isCompleted: false, sortOrder: 15 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Cable Crunch", sets: 3, reps: "15-20", restSeconds: 45, notes: null, isCompleted: false, sortOrder: 16 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Hanging Leg Raise", sets: 3, reps: "10-12", restSeconds: 45, notes: null, isCompleted: false, sortOrder: 17 },
    ],
    "leg": [
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Leg Press (Yarım ROM)", sets: 4, reps: "15", restSeconds: 90, notes: "🦵 Menisküs: Sadece yarı açı! Kontrollü yap", isCompleted: false, sortOrder: 10 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Lying Leg Curl", sets: 4, reps: "12-15", restSeconds: 75, notes: null, isCompleted: false, sortOrder: 11 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Leg Extension (Hafif)", sets: 3, reps: "15", restSeconds: 60, notes: "🦵 Ağırlığı düşük tut", isCompleted: false, sortOrder: 12 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Adductor Machine", sets: 3, reps: "15", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 13 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Abductor Machine", sets: 3, reps: "15", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 14 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Seated Calf Raise", sets: 4, reps: "15-20", restSeconds: 45, notes: null, isCompleted: false, sortOrder: 15 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Romanian Deadlift (Hafif)", sets: 3, reps: "12", restSeconds: 75, notes: "🦵 Ağırlık düşük, teknik önce", isCompleted: false, sortOrder: 16 },
    ],
    "chest-back-volume": [
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Flat Dumbbell Press", sets: 4, reps: "8-10", restSeconds: 90, notes: "Haftan en ağır set", isCompleted: false, sortOrder: 10 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Lat Pulldown", sets: 4, reps: "8-10", restSeconds: 90, notes: null, isCompleted: false, sortOrder: 11 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Incline Press", sets: 3, reps: "10-12", restSeconds: 75, notes: null, isCompleted: false, sortOrder: 12 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Seated Row", sets: 3, reps: "10-12", restSeconds: 75, notes: null, isCompleted: false, sortOrder: 13 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Cable Fly", sets: 3, reps: "12-15", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 14 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Straight Arm Pulldown", sets: 3, reps: "12-15", restSeconds: 60, notes: null, isCompleted: false, sortOrder: 15 },
      { dailyPlanId, section: "main", sectionLabel: "ANA ANTRENMAN", name: "Plank", sets: 3, reps: "30sn", restSeconds: 45, notes: null, isCompleted: false, sortOrder: 16 },
    ],
  };

  return [...warmup, ...(splitMap[splitType] ?? []), ...cooldown];
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ──────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Create user
  console.log("Creating user...");
  const [user] = await db
    .insert(schema.users)
    .values({
      name: "Fitness User",
      email: "user@fittrack.app",
      height: 178,
      weight: "96",
      targetWeight: "85",
      healthNotes: "Sağ diz menisküs, sol el bileği hafif ağrısı. Süt kullanılmıyor.",
    })
    .returning();

  // ──────────────────────────────────────────────────────────────────────────
  // WEEK 1 — Full Body Adaptasyon
  // ──────────────────────────────────────────────────────────────────────────
  console.log("Creating Week 1...");
  const [week1] = await db
    .insert(schema.weeklyPlans)
    .values({
      userId: user.id,
      weekNumber: 1,
      title: "Hafta 1 — Full Body Adaptasyon",
      phase: "adaptation",
      notes: "Ağırlıklar çok hafif başla, tekniğe odaklan. Menisküs egzersizlerinde yarım ROM uygula.",
    })
    .returning();

  // W1 days: Pzt(0) workout, Sal(1) swimming, Çar(2) workout, Per(3) swimming, Cum(4) workout, Cmt(5) swimming, Paz(6) rest
  const w1Days = [
    { dayOfWeek: 0, dayName: "Pazartesi", planType: "workout", workoutTitle: "Full Body A — Adaptasyon" },
    { dayOfWeek: 1, dayName: "Salı", planType: "swimming", workoutTitle: "Yüzme + Buhar Odası" },
    { dayOfWeek: 2, dayName: "Çarşamba", planType: "workout", workoutTitle: "Full Body B — Adaptasyon" },
    { dayOfWeek: 3, dayName: "Perşembe", planType: "swimming", workoutTitle: "Yüzme + Buhar Odası" },
    { dayOfWeek: 4, dayName: "Cuma", planType: "workout", workoutTitle: "Full Body C — Adaptasyon" },
    { dayOfWeek: 5, dayName: "Cumartesi", planType: "swimming", workoutTitle: "Yüzme + Sauna" },
    { dayOfWeek: 6, dayName: "Pazar", planType: "rest", workoutTitle: null },
  ];

  for (const day of w1Days) {
    const [dailyPlan] = await db
      .insert(schema.dailyPlans)
      .values({ weeklyPlanId: week1.id, ...day })
      .returning();

    if (day.planType === "workout") {
      const variant = day.dayOfWeek === 0 ? "A" : day.dayOfWeek === 2 ? "B" : "C";
      const exercises = fullBodyExercises(dailyPlan.id, variant);
      await db.insert(schema.exercises).values(exercises);
      const meals = workoutDayMeals(dailyPlan.id, day.dayOfWeek, 1);
      await db.insert(schema.meals).values(meals);
    } else if (day.planType === "swimming") {
      const exercises = swimmingExercises(dailyPlan.id);
      await db.insert(schema.exercises).values(exercises);
      const meals = offDayMeals(dailyPlan.id, day.dayOfWeek);
      await db.insert(schema.meals).values(meals);
    } else {
      const meals = restDayMeals(dailyPlan.id);
      await db.insert(schema.meals).values(meals);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WEEK 2 — Full Body (same structure, slightly more intensity)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("Creating Week 2...");
  const [week2] = await db
    .insert(schema.weeklyPlans)
    .values({
      userId: user.id,
      weekNumber: 2,
      title: "Hafta 2 — Full Body İlerleme",
      phase: "adaptation",
      notes: "Ağırlıkları hafifçe artır. Form hâlâ öncelikli. Yüzme sürelerini uzatabilirsin.",
    })
    .returning();

  for (const day of w1Days) {
    const [dailyPlan] = await db
      .insert(schema.dailyPlans)
      .values({ weeklyPlanId: week2.id, ...day })
      .returning();

    if (day.planType === "workout") {
      const variant = day.dayOfWeek === 0 ? "A" : day.dayOfWeek === 2 ? "B" : "C";
      const exercises = fullBodyExercises(dailyPlan.id, variant);
      await db.insert(schema.exercises).values(exercises);
      const meals = workoutDayMeals(dailyPlan.id, day.dayOfWeek, 2);
      await db.insert(schema.meals).values(meals);
    } else if (day.planType === "swimming") {
      const exercises = swimmingExercises(dailyPlan.id);
      await db.insert(schema.exercises).values(exercises);
      const meals = offDayMeals(dailyPlan.id, day.dayOfWeek);
      await db.insert(schema.meals).values(meals);
    } else {
      const meals = restDayMeals(dailyPlan.id);
      await db.insert(schema.meals).values(meals);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WEEK 3 — Split Program
  // ──────────────────────────────────────────────────────────────────────────
  console.log("Creating Week 3...");
  const [week3] = await db
    .insert(schema.weeklyPlans)
    .values({
      userId: user.id,
      weekNumber: 3,
      title: "Hafta 3 — Bölgesel Split Başlangıç",
      phase: "split",
      notes: "Artık her gün salon. Whey protein SU ile başlıyor. Her bölgeye özel odak.",
    })
    .returning();

  const w3Days = [
    { dayOfWeek: 0, dayName: "Pazartesi", planType: "workout", workoutTitle: "Göğüs + Tricep", splitType: "chest-tricep" },
    { dayOfWeek: 1, dayName: "Salı", planType: "workout", workoutTitle: "Sırt + Bicep", splitType: "back-bicep" },
    { dayOfWeek: 2, dayName: "Çarşamba", planType: "workout", workoutTitle: "Omuz + Karın", splitType: "shoulder-abs" },
    { dayOfWeek: 3, dayName: "Perşembe", planType: "workout", workoutTitle: "Bacak (Menisküs Uyumlu) 🦵", splitType: "leg" },
    { dayOfWeek: 4, dayName: "Cuma", planType: "workout", workoutTitle: "Göğüs + Sırt (Hacim)", splitType: "chest-back-volume" },
    { dayOfWeek: 5, dayName: "Cumartesi", planType: "swimming", workoutTitle: "Yüzme + Sauna" },
    { dayOfWeek: 6, dayName: "Pazar", planType: "rest", workoutTitle: null },
  ];

  for (const day of w3Days) {
    const [dailyPlan] = await db
      .insert(schema.dailyPlans)
      .values({ weeklyPlanId: week3.id, dayOfWeek: day.dayOfWeek, dayName: day.dayName, planType: day.planType, workoutTitle: day.workoutTitle })
      .returning();

    if (day.planType === "workout") {
      const exercises = splitExercises(dailyPlan.id, day.splitType!);
      await db.insert(schema.exercises).values(exercises);
      const meals = workoutDayMeals(dailyPlan.id, day.dayOfWeek, 3);
      await db.insert(schema.meals).values(meals);
    } else if (day.planType === "swimming") {
      const exercises = swimmingExercises(dailyPlan.id);
      await db.insert(schema.exercises).values(exercises);
      const meals = offDayMeals(dailyPlan.id, day.dayOfWeek);
      await db.insert(schema.meals).values(meals);
    } else {
      const meals = restDayMeals(dailyPlan.id);
      await db.insert(schema.meals).values(meals);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WEEK 4 — Split Intensity Up
  // ──────────────────────────────────────────────────────────────────────────
  console.log("Creating Week 4...");
  const [week4] = await db
    .insert(schema.weeklyPlans)
    .values({
      userId: user.id,
      weekNumber: 4,
      title: "Hafta 4 — Bölgesel Split İlerleme",
      phase: "split",
      notes: "Ağırlıkları artır. Omega-3 ve Magnezyum ekleniyor. Dört haftanın doruk noktası!",
    })
    .returning();

  for (const day of w3Days) {
    const [dailyPlan] = await db
      .insert(schema.dailyPlans)
      .values({ weeklyPlanId: week4.id, dayOfWeek: day.dayOfWeek, dayName: day.dayName, planType: day.planType, workoutTitle: day.workoutTitle })
      .returning();

    if (day.planType === "workout") {
      const exercises = splitExercises(dailyPlan.id, day.splitType!);
      await db.insert(schema.exercises).values(exercises);
      const meals = workoutDayMeals(dailyPlan.id, day.dayOfWeek, 4);
      await db.insert(schema.meals).values(meals);
    } else if (day.planType === "swimming") {
      const exercises = swimmingExercises(dailyPlan.id);
      await db.insert(schema.exercises).values(exercises);
      const meals = offDayMeals(dailyPlan.id, day.dayOfWeek);
      await db.insert(schema.meals).values(meals);
    } else {
      const meals = restDayMeals(dailyPlan.id);
      await db.insert(schema.meals).values(meals);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUPPLEMENTS
  // ──────────────────────────────────────────────────────────────────────────
  console.log("Creating supplements...");

  // Week 3 supplements
  await db.insert(schema.supplements).values({
    weeklyPlanId: week3.id,
    name: "Whey Protein",
    dosage: "1 kepçe (25g protein)",
    timing: "Antrenman sonrası (21:00) — SU ile hazırla",
    notes: "⚠️ Süt YOK — mutlaka su ile karıştır",
    startWeek: 3,
  });

  // Week 4 supplements
  await db.insert(schema.supplements).values([
    {
      weeklyPlanId: week4.id,
      name: "Whey Protein",
      dosage: "1 kepçe (25g protein)",
      timing: "Antrenman sonrası (21:00) — SU ile hazırla",
      notes: "⚠️ Süt YOK — mutlaka su ile karıştır",
      startWeek: 3,
    },
    {
      weeklyPlanId: week4.id,
      name: "Omega-3",
      dosage: "1000mg",
      timing: "Kahvaltıyla birlikte (11:00)",
      notes: "Yemekle birlikte al, balık yağı kokusu azalır",
      startWeek: 4,
    },
    {
      weeklyPlanId: week4.id,
      name: "Magnezyum",
      dosage: "200-400mg",
      timing: "Gece (22:00-22:30 arası)",
      notes: "Uyku kalitesini ve kas toparlanmasını artırır",
      startWeek: 4,
    },
  ]);

  // ──────────────────────────────────────────────────────────────────────────
  // SHOPPING LIST
  // ──────────────────────────────────────────────────────────────────────────
  console.log("Creating shopping list...");

  const shoppingItems = [
    // Protein
    { category: "🥩 Protein", itemName: "Yumurta", quantity: "30 adet", notes: "Hepsi haftalık tüketilir", sortOrder: 1 },
    { category: "🥩 Protein", itemName: "Tavuk göğsü", quantity: "1 kg", notes: null, sortOrder: 2 },
    { category: "🥩 Protein", itemName: "Hindi göğsü", quantity: "500g", notes: null, sortOrder: 3 },
    { category: "🥩 Protein", itemName: "Somon fileto", quantity: "400g", notes: null, sortOrder: 4 },
    { category: "🥩 Protein", itemName: "Kırmızı et (yağsız)", quantity: "300g", notes: null, sortOrder: 5 },
    { category: "🥩 Protein", itemName: "Ton balığı", quantity: "3 kutu", notes: "Yağlı suda", sortOrder: 6 },
    { category: "🥩 Protein", itemName: "Lor peyniri", quantity: "500g", notes: null, sortOrder: 7 },
    { category: "🥩 Protein", itemName: "Beyaz peynir", quantity: "200g", notes: null, sortOrder: 8 },
    { category: "🥩 Protein", itemName: "Kaşar peyniri", quantity: "150g", notes: null, sortOrder: 9 },

    // Süt Ürünleri (SÜTSÜZ)
    { category: "🥛 Süt Ürünleri (Süt Yok!)", itemName: "Yoğurt", quantity: "1 kg", notes: "Tam yağlı veya %2", sortOrder: 1 },
    { category: "🥛 Süt Ürünleri (Süt Yok!)", itemName: "Ayran", quantity: "1 L", notes: "⚠️ SÜT DEĞİL ayran", sortOrder: 2 },

    // Meyve
    { category: "🍎 Meyveler", itemName: "Muz", quantity: "8 adet", notes: "Olgunlaşmamış tercih et", sortOrder: 1 },
    { category: "🍎 Meyveler", itemName: "Elma", quantity: "5 adet", notes: null, sortOrder: 2 },
    { category: "🍎 Meyveler", itemName: "Çilek", quantity: "250g", notes: null, sortOrder: 3 },
    { category: "🍎 Meyveler", itemName: "Armut", quantity: "4 adet", notes: null, sortOrder: 4 },
    { category: "🍎 Meyveler", itemName: "Limon", quantity: "4 adet", notes: null, sortOrder: 5 },
    { category: "🍎 Meyveler", itemName: "Avokado", quantity: "2 adet", notes: null, sortOrder: 6 },

    // Sebze
    { category: "🥦 Sebzeler", itemName: "Domates", quantity: "1 kg", notes: null, sortOrder: 1 },
    { category: "🥦 Sebzeler", itemName: "Salatalık", quantity: "6 adet", notes: null, sortOrder: 2 },
    { category: "🥦 Sebzeler", itemName: "Biber (sivri)", quantity: "500g", notes: null, sortOrder: 3 },
    { category: "🥦 Sebzeler", itemName: "Brokoli", quantity: "1 demet", notes: null, sortOrder: 4 },
    { category: "🥦 Sebzeler", itemName: "Havuç", quantity: "500g", notes: null, sortOrder: 5 },
    { category: "🥦 Sebzeler", itemName: "Yeşillik (maydanoz, dereotu)", quantity: "3 demet", notes: null, sortOrder: 6 },
    { category: "🥦 Sebzeler", itemName: "Patlıcan", quantity: "3 adet", notes: null, sortOrder: 7 },
    { category: "🥦 Sebzeler", itemName: "Kabak", quantity: "3 adet", notes: null, sortOrder: 8 },
    { category: "🥦 Sebzeler", itemName: "Soğan", quantity: "500g", notes: null, sortOrder: 9 },
    { category: "🥦 Sebzeler", itemName: "Sarımsak", quantity: "1 baş", notes: null, sortOrder: 10 },
    { category: "🥦 Sebzeler", itemName: "Ispanak", quantity: "1 demet", notes: null, sortOrder: 11 },
    { category: "🥦 Sebzeler", itemName: "Mantar", quantity: "250g", notes: null, sortOrder: 12 },

    // Karbonhidrat
    { category: "🍞 Karbonhidratlar", itemName: "Çavdar ekmeği", quantity: "1 paket", notes: null, sortOrder: 1 },
    { category: "🍞 Karbonhidratlar", itemName: "Tam buğday ekmeği", quantity: "1 paket", notes: null, sortOrder: 2 },
    { category: "🍞 Karbonhidratlar", itemName: "Yulaf", quantity: "500g", notes: null, sortOrder: 3 },
    { category: "🍞 Karbonhidratlar", itemName: "Bulgur", quantity: "500g", notes: null, sortOrder: 4 },
    { category: "🍞 Karbonhidratlar", itemName: "Makarna (tam buğday)", quantity: "500g", notes: null, sortOrder: 5 },
    { category: "🍞 Karbonhidratlar", itemName: "Kinoa", quantity: "250g", notes: null, sortOrder: 6 },

    // Kuruyemiş
    { category: "🥜 Kuruyemiş & Yağlar", itemName: "Badem", quantity: "200g", notes: null, sortOrder: 1 },
    { category: "🥜 Kuruyemiş & Yağlar", itemName: "Ceviz", quantity: "200g", notes: null, sortOrder: 2 },
    { category: "🥜 Kuruyemiş & Yağlar", itemName: "Kaju", quantity: "100g", notes: null, sortOrder: 3 },
    { category: "🥜 Kuruyemiş & Yağlar", itemName: "Fındık", quantity: "100g", notes: null, sortOrder: 4 },
    { category: "🥜 Kuruyemiş & Yağlar", itemName: "Fıstık ezmesi (doğal)", quantity: "350g", notes: null, sortOrder: 5 },
    { category: "🥜 Kuruyemiş & Yağlar", itemName: "Zeytin", quantity: "1 kavanoz", notes: null, sortOrder: 6 },
    { category: "🥜 Kuruyemiş & Yağlar", itemName: "Zeytinyağı", quantity: "500ml", notes: "Soğuk sıkım", sortOrder: 7 },
    { category: "🥜 Kuruyemiş & Yağlar", itemName: "Hurma", quantity: "200g", notes: null, sortOrder: 8 },
    { category: "🥜 Kuruyemiş & Yağlar", itemName: "Tahın", quantity: "1 kavanoz", notes: null, sortOrder: 9 },

    // Temel
    { category: "🫙 Temel Ürünler", itemName: "Bal", quantity: "1 kavanoz", notes: "Doğal, işlenmemiş", sortOrder: 1 },
    { category: "🫙 Temel Ürünler", itemName: "Chia tohumu", quantity: "200g", notes: null, sortOrder: 2 },
    { category: "🫙 Temel Ürünler", itemName: "Zerdeçal", quantity: "1 küçük paket", notes: null, sortOrder: 3 },
    { category: "🫙 Temel Ürünler", itemName: "Tarçın", quantity: "1 kutu", notes: null, sortOrder: 4 },
    { category: "🫙 Temel Ürünler", itemName: "Nar ekşisi", quantity: "1 şişe", notes: null, sortOrder: 5 },
    { category: "🫙 Temel Ürünler", itemName: "Granola (şekersiz)", quantity: "300g", notes: null, sortOrder: 6 },
  ];

  // Add shopping list to all 4 weeks
  for (const weekPlan of [week1, week2, week3, week4]) {
    await db.insert(schema.shoppingLists).values(
      shoppingItems.map((item) => ({
        weeklyPlanId: weekPlan.id,
        ...item,
        isPurchased: false,
      }))
    );
  }

  console.log("✅ Seed complete!");
  console.log(`  ✔ User created: ${user.id}`);
  console.log("  ✔ 4 weekly plans created");
  console.log("  ✔ 28 daily plans created");
  console.log("  ✔ Meals, exercises seeded");
  console.log("  ✔ Supplements for Week 3-4");
  console.log("  ✔ Shopping list for all weeks");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
