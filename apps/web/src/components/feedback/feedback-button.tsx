"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { FeedbackModal } from "./feedback-modal";
import { AdminLinkButton } from "@/components/layout/admin-link-button";
import { useTranslations } from "next-intl";

export function FeedbackButton() {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);
  return (
    <>
      <AdminLinkButton />
      <button
        onClick={() => setOpen(true)}
        className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
        aria-label={t("ariaLabel")}
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
