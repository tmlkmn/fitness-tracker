import {
  formatTimeUntilReset,
  getNextQuotaReset,
} from "@/lib/quota-reset";

export function formatAiError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "AI özelliği şu anda kullanılamıyor. Lütfen tekrar deneyin.";
  }
  const msg = err.message;

  if (msg === "RATE_LIMITED") {
    const countdown = formatTimeUntilReset(getNextQuotaReset());
    return `Günlük AI limitine ulaştın — ${countdown} sonra yenilenir.`;
  }

  if (msg.startsWith("RATE_LIMITED:")) {
    const secs = Number.parseInt(msg.slice("RATE_LIMITED:".length), 10);
    if (Number.isFinite(secs) && secs > 0) {
      return `Çok fazla istek gönderdin. Lütfen ${formatSeconds(secs)} bekle.`;
    }
    return "Çok fazla istek gönderdin. Lütfen biraz bekle.";
  }

  if (msg.startsWith("COOLDOWN:")) {
    const secs = Number.parseInt(msg.slice("COOLDOWN:".length), 10);
    if (Number.isFinite(secs) && secs > 0) {
      return `Lütfen ${formatSeconds(secs)} bekle, ardından tekrar dene.`;
    }
    return "Lütfen biraz bekle, ardından tekrar dene.";
  }

  if (msg === "AI_UNAVAILABLE") {
    return "AI şu an kullanılamıyor. Lütfen tekrar dene.";
  }

  return "Bir hata oluştu. Lütfen tekrar dene.";
}

function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} sn`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) return `${minutes} dk`;
  return `${minutes} dk ${seconds} sn`;
}
