"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { FeedbackModal } from "./feedback-modal";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
        aria-label="Geri Bildirim Gönder"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
