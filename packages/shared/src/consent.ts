// KVKK explicit consents, recorded server-side as timestamps on the user
// (`users.data_consent_at`, `users.ai_consent_at`).
//
// - Data consent (required to use the app): processing health data (KVKK
//   art. 6) and storing the account's data with the hosting providers abroad
//   (KVKK art. 9).
// - AI consent (optional): sending the profile, health notes and plans the
//   AI features need to Anthropic in the USA.
//
// A consent counts only when it was given on or after its `*_SINCE` moment.
// When the consent texts change materially, move the moment forward: everyone
// is asked again on their next visit.

export const DATA_CONSENT_SINCE = "2026-11-01T00:00:00.000Z";
export const AI_CONSENT_SINCE = "2026-11-01T00:00:00.000Z";

export function isConsentCurrent(
  at: Date | string | null | undefined,
  since: string,
): boolean {
  if (!at) return false;
  const time = new Date(at).getTime();
  return Number.isFinite(time) && time >= Date.parse(since);
}

export const hasDataConsent = (at: Date | string | null | undefined) =>
  isConsentCurrent(at, DATA_CONSENT_SINCE);

export const hasAiConsent = (at: Date | string | null | undefined) =>
  isConsentCurrent(at, AI_CONSENT_SINCE);
