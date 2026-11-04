import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { Avatar } from "@/components/community/Avatar";
import { CommentForm } from "@/components/community/CommentForm";
import { DeleteCommentButton } from "@/components/community/DeleteCommentButton";
import { ReviewPost } from "@/components/community/ReviewPost";
import { relativeTime } from "@/lib/books/format";
import { getReviewThread } from "@/lib/books/queries";

export default function ResenhaPage({ params }: PageProps<"/resenha/[reviewId]">) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href="/timeline" className="inline-flex items-center gap-1 font-semibold text-coral-dark hover:underline">
        <ChevronLeft className="size-5" aria-hidden /> Timeline
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-ink/5" aria-busy="true" />}>
        <Thread params={params} />
      </Suspense>
    </div>
  );
}

async function Thread({ params }: Pick<PageProps<"/resenha/[reviewId]">, "params">) {
  const { reviewId } = await params;
  const thread = await getReviewThread(reviewId);
  if (!thread) notFound();
  const { post, comments } = thread;

  return (
    <>
      <ReviewPost
        author={{ id: post.userId, name: post.userName, mine: post.mine }}
        book={{ id: post.bookId, title: post.bookTitle, author: post.bookAuthor, coverUrl: post.coverUrl }}
        rating={post.rating}
        content={post.content}
        spoiler={post.spoiler}
        sharedAt={post.sharedAt}
      />

      <section aria-labelledby="comentarios" className="space-y-5">
        <h2 id="comentarios" className="font-display text-3xl font-medium">
          {comments.length === 0
            ? "Comentários"
            : `${comments.length} ${comments.length === 1 ? "comentário" : "comentários"}`}
        </h2>

        {comments.length > 0 && (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li
                key={c.id}
                id={`comentario-${c.id}`}
                className="flex scroll-mt-6 gap-3 rounded-3xl bg-paper-soft p-4 ring-1 ring-ink/5 target:ring-2 target:ring-coral/50"
              >
                <Link href={`/leitores/${c.userId}`} aria-label={c.userName}>
                  <Avatar name={c.userName} seed={c.userId} className="size-9 text-sm" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">
                      <Link href={`/leitores/${c.userId}`} className="font-semibold hover:underline">
                        {c.userName}
                      </Link>{" "}
                      <span className="text-graphite">· {relativeTime(c.createdAt)}</span>
                    </p>
                    {c.canDelete && <DeleteCommentButton commentId={c.id} />}
                  </div>
                  <p className="mt-1 leading-relaxed whitespace-pre-line">{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {post.shared ? (
          <div className="rounded-3xl bg-paper-soft p-4 ring-1 ring-ink/5 sm:p-5">
            <CommentForm reviewId={post.reviewId} />
          </div>
        ) : (
          <p className="flex items-start gap-3 rounded-2xl bg-ink/5 px-4 py-3 text-sm text-graphite">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            Esta resenha não está compartilhada: só você vê a conversa, e ninguém pode comentar. Para abrir de novo,
            ligue “Compartilhar na timeline” na página do livro.
          </p>
        )}
      </section>
    </>
  );
}
