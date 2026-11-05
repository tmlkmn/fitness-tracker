import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPublicSignupEnabled } from "@/lib/feature-flags";
import { SignupForm } from "@/components/billing/signup-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  // Public signup stays closed until the billing launch — invite-only model.
  if (!isPublicSignupEnabled()) {
    notFound();
  }
  return <SignupForm />;
}
