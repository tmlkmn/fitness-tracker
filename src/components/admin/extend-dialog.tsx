"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  extendMembership,
  type MembershipType,
  type UserWithStatus,
} from "@/actions/admin";
import { MEMBERSHIP_OPTION_VALUES } from "./admin-labels";

export function ExtendDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: UserWithStatus;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("admin");
  const tMembership = useTranslations("admin.membership");
  const [type, setType] = useState<MembershipType>(
    (user.membershipType as MembershipType) ?? "1-month",
  );
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (type === "custom" && !customEndDate) {
      setError(t("errors.endDateRequired"));
      return;
    }
    if (type === "custom" && new Date(customEndDate) <= new Date()) {
      setError(t("errors.endDateAfterToday"));
      return;
    }

    setLoading(true);
    try {
      await extendMembership(
        user.id,
        type,
        type === "custom" ? customEndDate : undefined,
      );
      onSuccess();
    } catch {
      setError(t("errors.membershipUpdateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {t("extendDialog.title")}
            </h2>
            <button
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{user.name}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MembershipType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {MEMBERSHIP_OPTION_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value === "custom"
                    ? tMembership("customDate")
                    : tMembership(value)}
                </option>
              ))}
            </select>
            {type === "custom" && (
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            )}
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("extendDialog.submit")
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
