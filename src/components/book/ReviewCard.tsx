"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Lock, Pencil, Users } from "lucide-react";
import { formatDate } from "@/lib/books/format";
import type { Review } from "@/types/book";
import { ReviewForm } from "./ReviewForm";

interface ReviewCardProps {
  bookId: string;
  review: Review | null;
}

/** "Minha resenha": leitura com "Editar", ou o formulário quando ainda não há resenha. */
export function ReviewCard({ bookId, review }: ReviewCardProps) {
  const router = useRouter();
  const hasReview = Boolean(review?.content.trim());
  const [editing, setEditing] = useState(!hasReview);

  return (
    <section
      id="resenha"
      aria-labelledby="resenha-titulo"
      className="scroll-mt-8 self-start rounded-[2rem] bg-paper-soft p-6 sm:p-10"
    >
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h2 id="resenha-titulo" className="font-display text-3xl font-medium sm:text-4xl">
          Minha resenha
        </h2>
        {hasReview && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-coral-dark hover:underline"
          >
            <Pencil className="size-4" aria-hidden />
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <ReviewForm
          bookId={bookId}
          review={review}
          onSaved={() => {
            setEditing(false);
            // Atualiza a nota no topo da página e nas estantes.
            router.refresh();
          }}
          onCancel={hasReview ? () => setEditing(false) : undefined}
        />
      ) : (
        <>
          <p className="font-serif text-xl leading-relaxed whitespace-pre-line">{review?.content}</p>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            {review?.shared ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1 font-semibold text-[#2F5654]">
                <Users className="size-3.5" aria-hidden /> Compartilhada na timeline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1 font-semibold text-graphite">
                <Lock className="size-3.5" aria-hidden /> Só para você
              </span>
            )}
            {review?.shared && review.spoiler && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1 font-semibold text-coral-dark">
                <EyeOff className="size-3.5" aria-hidden /> Contém spoiler
              </span>
            )}
            {review?.updated_at && <span className="text-graphite">Escrita em {formatDate(review.updated_at)}</span>}
          </div>
        </>
      )}
    </section>
  );
}
