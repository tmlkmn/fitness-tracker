"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";
import { OnboardingCarousel } from "./onboarding-carousel";

export function OnboardingTrigger() {
  const t = useTranslations("onboarding.trigger");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
        aria-label={t("ariaLabel")}
      >
        <HelpCircle className="h-5 w-5 text-muted-foreground" />
      </button>
      <OnboardingCarousel open={open} onOpenChange={setOpen} />
    </>
  );
}
