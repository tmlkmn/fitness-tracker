"use client";

import { useState } from "react";
import { inviteUser } from "@/actions/admin";
import type { MembershipType } from "@/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Loader2, CheckCircle, Copy, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/locale";

const MEMBERSHIP_KEYS: { value: MembershipType; tKey: string }[] = [
  { value: "1-month", tKey: "1-month" },
  { value: "3-month", tKey: "3-month" },
  { value: "6-month", tKey: "6-month" },
  { value: "1-year", tKey: "1-year" },
  { value: "unlimited", tKey: "unlimited" },
  { value: "custom", tKey: "custom" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const tInvite = useTranslations("admin.invite.success");
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors shrink-0"
      aria-label={tInvite("copy")}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

export default function DavetPage() {
  const tInvite = useTranslations("admin.invite");
  const tMembership = useTranslations("admin.membership");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [membershipType, setMembershipType] = useState<MembershipType>("1-month");
  const [customEndDate, setCustomEndDate] = useState("");
  const [userLocale, setUserLocale] = useState<Locale>("tr");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (membershipType === "custom" && !customEndDate) {
      setError(tInvite("errors.endDateRequired"));
      return;
    }
    if (membershipType === "custom" && new Date(customEndDate) <= new Date()) {
      setError(tInvite("errors.endDateAfterToday"));
      return;
    }

    setLoading(true);

    try {
      const result = await inviteUser(
        email,
        name,
        {
          type: membershipType,
          ...(membershipType === "custom" ? { customEndDate } : {}),
        },
        userLocale,
      );
      setInvitedEmail(email);
      setTempPassword(result.tempPassword);
      setSuccess(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("already exists") || message.includes("ALREADY_EXISTS")) {
        setError(tInvite("errors.alreadyExists"));
      } else {
        setError(tInvite("errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-7 w-7 text-green-500" />
            </div>
            <h1 className="text-xl font-bold">{tInvite("success.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {tInvite("success.description")}
            </p>

            <div className="rounded-lg border border-border bg-card p-3 space-y-3 text-left">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{tInvite("success.emailLabel")}</p>
                  <p className="text-sm font-medium truncate">{invitedEmail}</p>
                </div>
                <CopyButton text={invitedEmail} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{tInvite("success.tempPasswordLabel")}</p>
                  <p className="text-sm font-mono font-bold text-primary tracking-wider">{tempPassword}</p>
                </div>
                <CopyButton text={tempPassword} />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSuccess(false);
                  setName("");
                  setEmail("");
                  setMembershipType("1-month");
                  setCustomEndDate("");
                  setUserLocale("tr");
                  setInvitedEmail("");
                  setTempPassword("");
                }}
                className="flex-1 h-10 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                {tInvite("success.newInvite")}
              </button>
              <Link
                href="/admin"
                className="flex-1 inline-flex items-center justify-center h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {tInvite("success.userList")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">{tInvite("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {tInvite("description")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium leading-none"
              >
                {tInvite("name")}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={tInvite("namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none"
              >
                {tInvite("email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={tInvite("emailPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="membership"
                className="text-sm font-medium leading-none"
              >
                {tInvite("membershipDuration")}
              </label>
              <select
                id="membership"
                value={membershipType}
                onChange={(e) => setMembershipType(e.target.value as MembershipType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {MEMBERSHIP_KEYS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {tMembership(opt.tKey)}
                  </option>
                ))}
              </select>
            </div>

            {membershipType === "custom" && (
              <div className="space-y-2">
                <label
                  htmlFor="customEndDate"
                  className="text-sm font-medium leading-none"
                >
                  {tInvite("endDate")}
                </label>
                <input
                  id="customEndDate"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="userLocale" className="text-sm font-medium leading-none">
                {tInvite("userLanguageLabel")}
              </label>
              <select
                id="userLocale"
                value={userLocale}
                onChange={(e) => setUserLocale(e.target.value as Locale)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {tInvite("userLanguageHint")}
              </p>
            </div>

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
                tInvite("submit")
              )}
            </button>
          </form>

          <div className="text-center">
            <Link
              href="/admin"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {tInvite("backToUsers")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
