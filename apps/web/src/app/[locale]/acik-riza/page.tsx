import type { Metadata } from "next";
import { ConsentForm } from "@/components/consent/consent-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ConsentPage() {
  return (
    <div className="min-h-dvh flex items-start justify-center p-4 pt-10">
      <ConsentForm />
    </div>
  );
}
