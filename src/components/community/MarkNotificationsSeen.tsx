"use client";

import { useEffect } from "react";
import { NOTIFICATIONS_SEEN } from "@/components/layout/NotificationBell";
import { createClient } from "@/lib/supabase/client";

/** Ao abrir a página, marca tudo como visto (o destaque das novas fica até sair). */
export function MarkNotificationsSeen() {
  useEffect(() => {
    createClient()
      .rpc("mark_notifications_seen")
      .then(({ error }) => {
        if (!error) window.dispatchEvent(new Event(NOTIFICATIONS_SEEN));
      });
  }, []);
  return null;
}
