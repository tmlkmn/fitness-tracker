"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { OnboardingCarousel } from "./onboarding-carousel";

export function OnboardingTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
        aria-label="Uygulama rehberi"
      >
        <HelpCircle className="h-5 w-5 text-muted-foreground" />
      </button>
      <OnboardingCarousel open={open} onOpenChange={setOpen} />
    </>
  );
}
