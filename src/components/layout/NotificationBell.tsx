"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Evento disparado quando a página de notificações marca tudo como visto. */
export const NOTIFICATIONS_SEEN = "caseLeitura:notificacoes-vistas";

/**
 * Sino do topo com o número de comentários novos nas suas resenhas. Atualiza a
 * cada navegação e quando o app volta para a frente (o layout não re-renderiza
 * na navegação, então a contagem vem do navegador).
 */
export function NotificationBell() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const active = pathname.startsWith("/notificacoes");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Na própria página tudo é marcado como visto; não buscar evita a contagem
      // antiga chegar depois e reacender o número.
      if (window.location.pathname.startsWith("/notificacoes")) return setUnread(0);
      const { data, error } = await createClient().rpc("unread_notifications");
      // Sem a migração (ou sem rede), o sino fica sem número.
      if (!cancelled) setUnread(error ? 0 : (data ?? 0));
    };
    const onVisible = () => document.visibilityState === "visible" && load();
    const onSeen = () => setUnread(0);
    load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATIONS_SEEN, onSeen);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATIONS_SEEN, onSeen);
    };
  }, [pathname]);

  const label = unread > 0 ? `Notificações: ${unread} ${unread === 1 ? "nova" : "novas"}` : "Notificações";

  return (
    <Link
      href="/notificacoes"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`relative flex size-12 items-center justify-center rounded-full transition-colors ${
        active ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
      }`}
    >
      <Bell className="size-[1.35rem]" strokeWidth={1.7} aria-hidden />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[0.68rem] leading-none font-bold text-white ring-2 ring-paper">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
