"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUserProfile } from "@/hooks/use-user";
import { useSession } from "@/lib/auth-client";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { ProfileEditorDialog } from "./profile-editor-dialog";
import { Pencil, User } from "lucide-react";

const MEMBERSHIP_LABELS: Record<string, string> = {
  unlimited: "Sınırsız",
  "1-month": "1 Ay",
  "3-month": "3 Ay",
  "6-month": "6 Ay",
  "1-year": "1 Yıl",
  custom: "Özel",
};

export function ProfileSummaryCard() {
  const { data: session } = useSession();
  const { data: profile } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);

  const user = session?.user;
  const completeness = computeProfileCompleteness(profile);

  const membershipLabel = profile?.membershipType
    ? MEMBERSHIP_LABELS[profile.membershipType] ?? profile.membershipType
    : null;

  const membershipEndTs = profile?.membershipEndDate
    ? new Date(profile.membershipEndDate).getTime()
    : null;
  const [membershipSnapshot, setMembershipSnapshot] = useState<{
    expired: boolean;
    remaining: number | null;
  }>({ expired: false, remaining: null });
  useEffect(() => {
    if (membershipEndTs == null) {
      setMembershipSnapshot({ expired: false, remaining: null });
      return;
    }
    const now = Date.now();
    const expired = membershipEndTs <= now;
    setMembershipSnapshot({
      expired,
      remaining: expired
        ? null
        : Math.ceil((membershipEndTs - now) / (1000 * 60 * 60 * 24)),
    });
  }, [membershipEndTs]);
  const membershipRemaining = membershipSnapshot.remaining;
  const membershipExpired = membershipSnapshot.expired;

  type ChipProps = {
    label: string;
    value: string | null | undefined;
    unit?: string;
    primary?: boolean;
  };

  const chip = ({ label, value, unit, primary }: ChipProps) => {
    const filled = value != null && value !== "";
    return (
      <div
        className={`flex-1 min-w-[68px] rounded-lg border p-2 text-center ${
          !filled
            ? "border-yellow-500/40 bg-yellow-500/5"
            : primary
              ? "border-primary/30 bg-primary/5"
              : "border-border/60 bg-muted/30"
        }`}
      >
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={`text-sm font-semibold tabular-nums mt-0.5 ${
            primary && filled ? "text-primary" : ""
          }`}
        >
          {filled ? `${value}${unit ? ` ${unit}` : ""}` : "—"}
        </p>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {user?.name || user?.email || "Profilim"}
              </p>
              {user?.email && user?.name && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
            {membershipLabel && (
              <Badge variant={membershipExpired ? "destructive" : "secondary"}>
                {membershipLabel}
                {membershipRemaining != null && ` · ${membershipRemaining}g`}
              </Badge>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Profil tamamlanması</span>
              <span className="text-xs font-medium tabular-nums">
                %{completeness.percent}
              </span>
            </div>
            <Progress value={completeness.percent} />
          </div>

          <div className="flex gap-1.5">
            {chip({ label: "Yaş", value: profile?.age != null ? String(profile.age) : null })}
            {chip({ label: "Boy", value: profile?.height != null ? String(profile.height) : null, unit: "cm" })}
            {chip({ label: "Kilo", value: profile?.weight || null, unit: "kg" })}
            {chip({ label: "Hedef", value: profile?.targetWeight || null, unit: "kg", primary: true })}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Profili Düzenle
          </Button>
        </CardContent>
      </Card>

      <ProfileEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={profile}
        userEmail={user?.email}
      />
    </>
  );
}
