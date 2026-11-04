import { Suspense } from "react";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { MarkNotificationsSeen } from "@/components/community/MarkNotificationsSeen";
import { NotificationList } from "@/components/community/NotificationList";
import { getNotifications } from "@/lib/books/queries";

export const metadata: Metadata = { title: "Notificações · caseLeitura" };

export default function NotificacoesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-4xl font-medium sm:text-5xl">Notificações</h1>
        <p className="mt-2 text-graphite">Comentários que outros leitores deixaram nas suas resenhas.</p>
      </header>
      <Suspense
        fallback={
          <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Carregando notificações">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-ink/5" />
            ))}
          </div>
        }
      >
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const notifications = await getNotifications();

  if (!notifications?.length) {
    return (
      <div className="rounded-[2rem] bg-paper-soft px-8 py-14 text-center">
        <MessageCircle className="mx-auto size-8 text-graphite/60" strokeWidth={1.5} aria-hidden />
        <p className="mx-auto mt-3 max-w-sm text-graphite">
          {notifications
            ? "Nenhum comentário ainda. Quando alguém comentar uma resenha sua, aparece aqui."
            : "As notificações ainda estão sendo ativadas."}
        </p>
      </div>
    );
  }

  return (
    <>
      <MarkNotificationsSeen />
      <NotificationList notifications={notifications} />
    </>
  );
}
