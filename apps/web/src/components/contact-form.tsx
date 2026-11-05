"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { submitContactMessage } from "@/actions/contact";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inputClass =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function ContactForm() {
  const t = useTranslations("contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !message.trim()) {
      return setError(t("errors.required"));
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return setError(t("errors.invalidEmail"));
    }

    setLoading(true);
    try {
      await submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setDone(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
        <span>{t("success")}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="c-name" className="text-sm font-medium">
          {t("name")}
        </label>
        <input
          id="c-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className={`${inputClass} h-10`}
          autoComplete="name"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="c-email" className="text-sm font-medium">
          {t("email")}
        </label>
        <input
          id="c-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          className={`${inputClass} h-10`}
          autoComplete="email"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="c-message" className="text-sm font-medium">
          {t("message")}
        </label>
        <textarea
          id="c-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          rows={5}
          className={`${inputClass} resize-y`}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
