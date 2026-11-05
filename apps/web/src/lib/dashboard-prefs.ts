export const DASHBOARD_CARDS = [
  { key: "rings", label: "Günlük Halkalar", description: "Kalori, protein ve görev tamamlama halkaları" },
  { key: "water_sleep", label: "Su ve Uyku", description: "Günlük su ve uyku widget'ları" },
  { key: "macro_trend", label: "Makro Trendi", description: "Son 7 gün makro sparkline" },
  { key: "stats", label: "Günlük Özet", description: "Antrenman ve beslenme ilerleme kartları" },
  { key: "quick_access", label: "Hızlı Erişim", description: "Takvim, ilerleme, alışveriş kartları" },
  { key: "streak", label: "Seri ve Rozetler", description: "Günlük seri ve rozet kartları" },
  { key: "friends", label: "Arkadaş Serileri", description: "Arkadaş liderlik tablosu" },
] as const;

export type DashboardCardKey = (typeof DASHBOARD_CARDS)[number]["key"];

export type DashboardPrefs = Partial<Record<DashboardCardKey, boolean>>;

const STORAGE_KEY = "fitmusc.dashboard-prefs";

export function loadDashboardPrefs(): DashboardPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DashboardPrefs;
  } catch {
    return {};
  }
}

export function saveDashboardPrefs(prefs: DashboardPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("fitmusc:dashboard-prefs"));
  } catch {
    // ignore quota/private-mode errors
  }
}

export function isCardVisible(prefs: DashboardPrefs, key: DashboardCardKey): boolean {
  return prefs[key] !== false;
}
