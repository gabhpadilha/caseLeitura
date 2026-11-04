import Link from "next/link";
import { Avatar } from "@/components/community/Avatar";
import { relativeTime } from "@/lib/books/format";
import type { CommentNotification } from "@/lib/books/queries";

/** Comentários nas suas resenhas; os ainda não vistos ficam em destaque. */
export function NotificationList({ notifications }: { notifications: CommentNotification[] }) {
  return (
    <ul className="space-y-3">
      {notifications.map((n) => (
        <li key={n.commentId}>
          <Link
            href={`/resenha/${n.reviewId}#comentario-${n.commentId}`}
            className={`flex gap-3 rounded-3xl p-4 ring-1 transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(36,35,43,0.5)] ${
              n.unread ? "bg-coral-soft/50 ring-coral/25" : "bg-paper-soft ring-ink/5"
            }`}
          >
            <Avatar name={n.authorName} seed={n.authorId} className="size-10 text-base" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <b className="font-semibold">{n.authorName}</b> comentou na sua resenha de{" "}
                <em className="font-display text-base font-semibold not-italic">{n.bookTitle}</em>
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-graphite">“{n.excerpt}”</p>
              <p className="mt-1.5 text-xs text-graphite">{relativeTime(n.createdAt)}</p>
            </div>
            {n.unread && (
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-coral">
                <span className="sr-only">Nova</span>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
