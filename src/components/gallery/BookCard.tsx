import Link from "next/link";
import { Star, TriangleAlert } from "lucide-react";
import { formatPercent, formatRating, readingTime } from "@/lib/books/format";
import type { BookCard as BookCardData } from "@/types/book";
import { BookCover } from "./BookCover";

interface BookCardProps {
  book: BookCardData;
  /**
   * "shelf": só a capa sobre a prateleira (o título já está na capa), com a
   * barra de progresso ou a nota embaixo. "grid": capa + título + autor.
   */
  variant?: "shelf" | "grid";
}

function Meta({ book }: { book: BookCardData }) {
  if (book.processing_status !== "ready") {
    return (
      <p className="flex items-center gap-1 text-xs text-coral-dark">
        <TriangleAlert className="size-3" aria-hidden />
        Sem texto extraível
      </p>
    );
  }
  if (book.status === "reading") {
    return (
      <div
        className="h-1 overflow-hidden rounded-full bg-ink/10"
        role="img"
        aria-label={`${formatPercent(book.progress)} lido`}
      >
        <div className="h-full rounded-full bg-coral" style={{ width: `${Math.max(book.progress, 3)}%` }} />
      </div>
    );
  }
  if (book.status === "finished" && book.rating) {
    return (
      <p className="flex items-center gap-1 text-sm font-medium text-coral-dark">
        <Star className="size-3.5 fill-coral text-coral" aria-hidden />
        {formatRating(book.rating)}
      </p>
    );
  }
  return null;
}

export function BookCard({ book, variant = "shelf" }: BookCardProps) {
  const label = `${book.title}${book.author ? `, de ${book.author}` : ""}`;

  return (
    <Link
      href={`/livros/${book.id}`}
      aria-label={variant === "shelf" ? label : undefined}
      title={variant === "shelf" ? label : undefined}
      className="group block rounded-md outline-none"
    >
      <BookCover
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        seed={book.id}
        className="w-full transition-transform duration-300 group-hover:-translate-y-1.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-coral"
      />
      {variant === "shelf" ? (
        <div className="mt-3 min-h-5">
          <Meta book={book} />
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          <h3 className="line-clamp-2 font-display text-lg leading-tight font-semibold">{book.title}</h3>
          {book.author && <p className="line-clamp-1 text-xs text-graphite">{book.author}</p>}
          {book.status === "to_read" && readingTime(book.word_count) ? (
            <p className="text-xs text-graphite">≈ {readingTime(book.word_count)} de leitura</p>
          ) : (
            <div className="pt-1">
              <Meta book={book} />
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
