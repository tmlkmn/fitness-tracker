/**
 * Public self-serve signup + the pricing-page CTA. While false the app stays
 * invite-only: /kayit returns notFound() and /fiyatlandirma is noindex. Flip
 * to "true" once company/billing processes are in place.
 */
export function isPublicSignupEnabled(): boolean {
  return process.env.FEATURE_PUBLIC_SIGNUP === "true";
}
