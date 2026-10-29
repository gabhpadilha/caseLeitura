import Link from "next/link";
import { Bookmark, BookOpen, CircleCheck, CircleSlash, Star, TriangleAlert } from "lucide-react";
import { formatPercent, formatRating, readingTime } from "@/lib/books/format";
import type { BookCard as BookCardData, ReadingStatus } from "@/types/book";
import { BookCover } from "./BookCover";
import { StatusBadge } from "./StatusBadge";

interface BookCardProps {
  book: BookCardData;
  /**
   * "shelf": só a capa, pousada na prateleira (o título já está na capa e o
   * estado vai no selo). "grid": capa + título, autor e progresso embaixo.
   */
  variant?: "shelf" | "grid";
  /** Selo com o estado (Lendo, Quero ler, Lido) sobre a capa. */
  showStatus?: boolean;
}

const SEAL_ICON: Record<ReadingStatus, typeof BookOpen> = {
  reading: BookOpen,
  to_read: Bookmark,
  finished: CircleCheck,
  abandoned: CircleSlash,
};

/** Selo sobre a capa: estado + o detalhe que importa (progresso ou nota). */
function StatusSeal({ book }: { book: BookCardData }) {
  const Icon = book.processing_status === "ready" ? SEAL_ICON[book.status] : TriangleAlert;
  const label =
    book.status === "reading" && book.progress > 0 ? (
      `Lendo · ${formatPercent(book.progress)}`
    ) : book.status === "finished" && book.rating ? (
      <>
        Lido ·<Star className="size-2.5 fill-current" aria-hidden />
        {formatRating(book.rating)}
      </>
    ) : undefined;

  return (
    <StatusBadge
      status={book.status}
      size="sm"
      icon={<Icon className="size-3" strokeWidth={2.2} aria-hidden />}
      label={label}
    />
  );
}

function GridMeta({ book }: { book: BookCardData }) {
  if (book.processing_status !== "ready") {
    return (
      <p className="flex items-center gap-1 text-xs text-coral-dark">
        <TriangleAlert className="size-3" aria-hidden />
        Sem texto extraível
      </p>
    );
  }
  if (book.status === "to_read" && readingTime(book.word_count)) {
    return <p className="text-xs text-graphite">≈ {readingTime(book.word_count)} de leitura</p>;
  }
  if (book.status === "reading") {
    return (
      <div className="h-1 overflow-hidden rounded-full bg-ink/10" role="img" aria-label={`${formatPercent(book.progress)} lido`}>
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

export function BookCard({ book, variant = "shelf", showStatus = false }: BookCardProps) {
  const label = [
    book.title,
    book.author && `de ${book.author}`,
    showStatus && `(${book.status === "reading" ? `lendo, ${formatPercent(book.progress)}` : book.status === "to_read" ? "quero ler" : book.status === "finished" ? "lido" : "abandonado"})`,
    book.processing_status !== "ready" && "sem texto extraível",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/livros/${book.id}`}
      aria-label={variant === "shelf" ? label : undefined}
      title={variant === "shelf" ? label : undefined}
      className="group block rounded-md outline-none"
    >
      {/* O selo fica fora da capa (que tem overflow oculto) e sobe junto no hover. */}
      <div className="relative transition-transform duration-300 group-hover:-translate-y-1.5">
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          seed={book.id}
          className="w-full group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-coral"
        />
        {showStatus && (
          <span className="absolute top-2 left-2 max-w-[calc(100%-1rem)]">
            <StatusSeal book={book} />
          </span>
        )}
      </div>
      {variant === "grid" && (
        <div className="mt-3 space-y-1">
          <h3 className="line-clamp-2 font-display text-lg leading-tight font-semibold">{book.title}</h3>
          {book.author && <p className="line-clamp-1 text-xs text-graphite">{book.author}</p>}
          <div className="pt-1">
            <GridMeta book={book} />
          </div>
        </div>
      )}
    </Link>
  );
}
