"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useUserProfile, useUpdateHealthProfile } from "@/hooks/use-user";
import type { UpdateHealthProfileInput } from "@/actions/user";

type Gender = UpdateHealthProfileInput["gender"];
type Activity = UpdateHealthProfileInput["dailyActivityLevel"];
type FlagKey =
  | "hasEatingDisorderHistory"
  | "isPregnantOrBreastfeeding"
  | "hasDiabetes"
  | "hasThyroidCondition";

const GENDER_VALUES: Gender[] = ["female", "male", "prefer_not_to_say"];
const ACTIVITY_VALUES: Activity[] = ["sedentary", "light", "moderate", "very_active"];
const FLAG_KEYS: FlagKey[] = [
  "hasEatingDisorderHistory",
  "isPregnantOrBreastfeeding",
  "hasDiabetes",
  "hasThyroidCondition",
];

interface InitialValues {
  gender: Gender;
  activity: Activity;
  flags: Record<FlagKey, boolean>;
}

function isGender(v: string | null): v is Gender {
  return v === "male" || v === "female" || v === "prefer_not_to_say";
}

function isActivity(v: string | null): v is Activity {
  return v === "sedentary" || v === "light" || v === "moderate" || v === "very_active";
}

export function HealthProfileCard() {
  const { data: profile } = useUserProfile();
  const t = useTranslations("settings.healthProfile");

  if (!profile) {
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const initial: InitialValues = {
    gender: isGender(profile.gender) ? profile.gender : "prefer_not_to_say",
    activity: isActivity(profile.dailyActivityLevel) ? profile.dailyActivityLevel : "light",
    flags: {
      hasEatingDisorderHistory: Boolean(profile.hasEatingDisorderHistory),
      isPregnantOrBreastfeeding: Boolean(profile.isPregnantOrBreastfeeding),
      hasDiabetes: Boolean(profile.hasDiabetes),
      hasThyroidCondition: Boolean(profile.hasThyroidCondition),
    },
  };

  return <HealthProfileForm initial={initial} />;
}

function HealthProfileForm({ initial }: { initial: InitialValues }) {
  const t = useTranslations("settings.healthProfile");
  const update = useUpdateHealthProfile();
  const [gender, setGender] = useState<Gender>(initial.gender);
  const [activity, setActivity] = useState<Activity>(initial.activity);
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>(initial.flags);

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        gender,
        dailyActivityLevel: activity,
        ...flags,
      });
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveError"));
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("intro")}
        </p>

        <FieldGroup title={t("genderTitle")}>
          {GENDER_VALUES.map((value) => (
            <RadioCard
              key={value}
              checked={gender === value}
              onClick={() => setGender(value)}
              label={t(`genders.${value}`)}
            />
          ))}
        </FieldGroup>

        <FieldGroup title={t("activityTitle")}>
          {ACTIVITY_VALUES.map((value) => (
            <RadioCard
              key={value}
              checked={activity === value}
              onClick={() => setActivity(value)}
              label={t(`activities.${value}.label`)}
              hint={t(`activities.${value}.hint`)}
            />
          ))}
        </FieldGroup>

        <FieldGroup title={t("flagsTitle")}>
          {FLAG_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
            >
              <Checkbox
                checked={flags[key]}
                onCheckedChange={() =>
                  setFlags((prev) => ({ ...prev, [key]: !prev[key] }))
                }
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed flex-1">{t(`flags.${key}`)}</span>
            </label>
          ))}
        </FieldGroup>

        <Button
          type="button"
          size="sm"
          className="w-full gap-1.5"
          onClick={handleSave}
          disabled={update.isPending}
        >
          {update.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
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
        checked ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40"
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
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
      </div>
    </button>
  );
}
