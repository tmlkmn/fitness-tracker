"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Info, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useUpdateHealthProfile } from "@/hooks/use-user";
import type { UpdateHealthProfileInput } from "@/actions/user";

type Gender = UpdateHealthProfileInput["gender"];
type Activity = UpdateHealthProfileInput["dailyActivityLevel"];

const GENDER_VALUES: Gender[] = ["female", "male", "prefer_not_to_say"];
const ACTIVITY_VALUES: Activity[] = ["sedentary", "light", "moderate", "very_active"];

type HealthFlagKey =
  | "hasEatingDisorderHistory"
  | "isPregnantOrBreastfeeding"
  | "hasDiabetes"
  | "hasThyroidCondition";

const HEALTH_FLAG_KEYS: HealthFlagKey[] = [
  "hasEatingDisorderHistory",
  "isPregnantOrBreastfeeding",
  "hasDiabetes",
  "hasThyroidCondition",
];

interface HealthProfileWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HealthProfileWizard({
  open,
  onOpenChange,
}: HealthProfileWizardProps) {
  const t = useTranslations("onboarding.healthWizard");
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender>("prefer_not_to_say");
  const [activity, setActivity] = useState<Activity>("light");
  const [flags, setFlags] = useState<Record<HealthFlagKey, boolean>>({
    hasEatingDisorderHistory: false,
    isPregnantOrBreastfeeding: false,
    hasDiabetes: false,
    hasThyroidCondition: false,
  });

  const update = useUpdateHealthProfile();
  const isLast = step === 2;

  const handleSubmit = async () => {
    try {
      await update.mutateAsync({
        gender,
        dailyActivityLevel: activity,
        ...flags,
      });
      toast.success(t("saved"));
      onOpenChange(false);
      setStep(0);
    } catch {
      toast.error(t("saveError"));
    }
  };

  const next = () => {
    if (isLast) {
      void handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const clearFlags = () => {
    setFlags({
      hasEatingDisorderHistory: false,
      isPregnantOrBreastfeeding: false,
      hasDiabetes: false,
      hasThyroidCondition: false,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (val) onOpenChange(true);
      }}
    >
      <DialogContent
        className="max-w-sm w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t("header")}
            </span>
          </div>

          {step === 0 && (
            <GenderStep value={gender} onChange={setGender} />
          )}
          {step === 1 && (
            <ActivityStep value={activity} onChange={setActivity} />
          )}
          {step === 2 && (
            <FlagsStep value={flags} onChange={setFlags} onClear={clearFlags} />
          )}

          <div className="flex justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center justify-between gap-2">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={prev} disabled={update.isPending}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("back")}
            </Button>
          ) : (
            <span />
          )}

          <Button size="sm" onClick={next} disabled={update.isPending}>
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {isLast ? t("save") : t("next")}
                {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GenderStep({
  value,
  onChange,
}: {
  value: Gender;
  onChange: (g: Gender) => void;
}) {
  const t = useTranslations("onboarding.healthWizard.gender");
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("intro")}
        </p>
      </div>
      <div role="radiogroup" className="space-y-2">
        {GENDER_VALUES.map((opt) => (
          <RadioCard
            key={opt}
            checked={value === opt}
            onClick={() => onChange(opt)}
            label={t(`options.${opt}`)}
          />
        ))}
      </div>
    </div>
  );
}

function ActivityStep({
  value,
  onChange,
}: {
  value: Activity;
  onChange: (a: Activity) => void;
}) {
  const t = useTranslations("onboarding.healthWizard.activity");
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("intro")}
        </p>
      </div>
      <div role="radiogroup" className="space-y-2">
        {ACTIVITY_VALUES.map((opt) => (
          <RadioCard
            key={opt}
            checked={value === opt}
            onClick={() => onChange(opt)}
            label={t(`options.${opt}.label`)}
            hint={t(`options.${opt}.hint`)}
          />
        ))}
      </div>
    </div>
  );
}

function FlagsStep({
  value,
  onChange,
  onClear,
}: {
  value: Record<HealthFlagKey, boolean>;
  onChange: (next: Record<HealthFlagKey, boolean>) => void;
  onClear: () => void;
}) {
  const t = useTranslations("onboarding.healthWizard.flags");
  const toggle = (key: HealthFlagKey) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("intro")}
          </p>
        </div>

        <div className="space-y-2">
          {HEALTH_FLAG_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
            >
              <Checkbox
                checked={value[key]}
                onCheckedChange={() => toggle(key)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed flex-1">
                {t(`items.${key}.label`)}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.preventDefault()}
                    aria-label={t("whyAriaLabel")}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[220px] text-xs">
                  <p className="font-semibold mb-1">{t("whyTitle")}</p>
                  <p>{t(`items.${key}.rationale`)}</p>
                </TooltipContent>
              </Tooltip>
            </label>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onClear}
          type="button"
        >
          {t("noneOfThese")}
        </Button>
      </div>
    </TooltipProvider>
  );
}

function RadioCard({
  checked,
  onClick,
  label,
  hint,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        checked
          ? "border-primary bg-primary/10"
          : "border-border hover:bg-accent/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
            checked ? "border-primary" : "border-muted-foreground/40"
          }`}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {hint && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
          )}
        </div>
      </div>
    </button>
  );
}
