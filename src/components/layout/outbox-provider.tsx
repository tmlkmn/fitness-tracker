"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startOutboxListeners } from "@/lib/outbox-drain";

export function OutboxProvider() {
  const qc = useQueryClient();

  useEffect(() => {
    return startOutboxListeners(qc);
  }, [qc]);

  return null;
}
