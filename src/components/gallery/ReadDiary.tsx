import Link from "next/link";
import { PencilLine, Star } from "lucide-react";
import { formatDate, readingDuration } from "@/lib/books/format";
import type { BookCard } from "@/types/book";
import { BookCover } from "./BookCover";

interface ReadDiaryProps {
  books: BookCard[];
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-sm text-graphite">Sem nota</span>;
  return (
    <span className="flex shrink-0 gap-0.5" role="img" aria-label={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-4 text-coral ${n <= rating ? "fill-coral" : "opacity-30"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

/** Ano em que terminou; sem data de término, cai no grupo "Sem data". */
function yearOf(book: BookCard) {
  return book.finished_at?.slice(0, 4) ?? "Sem data";
}

/** Diário de leituras: livros lidos agrupados por ano, com nota e resenha. */
export function ReadDiary({ books }: ReadDiaryProps) {
  const sorted = [...books].sort((a, b) =>
    (b.finished_at ?? "").localeCompare(a.finished_at ?? ""),
  );
  const groups = new Map<string, BookCard[]>();
  for (const book of sorted) groups.set(yearOf(book), [...(groups.get(yearOf(book)) ?? []), book]);

  return (
    <div className="space-y-12">
      {[...groups].map(([year, list]) => (
        <section key={year} aria-labelledby={`ano-${year}`}>
          <h2 id={`ano-${year}`} className="mb-2 flex items-baseline gap-3">
            <span className="font-display text-3xl font-medium">{year}</span>
            <span className="text-sm text-graphite">
              {list.length} {list.length === 1 ? "livro" : "livros"}
            </span>
          </h2>
          <ul className="divide-y divide-ink/10 border-t border-ink/10">
            {list.map((book) => {
              const duration = readingDuration(book.started_at, book.finished_at);
              const finished = formatDate(book.finished_at);
              return (
                <li key={book.id}>
                  <article className="grid grid-cols-[4.5rem_1fr] gap-5 py-6 sm:grid-cols-[5.5rem_1fr] sm:gap-7">
                    <Link href={`/livros/${book.id}`} aria-label={book.title}>
                      <BookCover
                        title={book.title}
                        author={book.author}
                        coverUrl={book.coverUrl}
                        seed={book.id}
                        size="sm"
                        className="w-full"
                      />
                    </Link>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <h3 className="font-display text-2xl leading-tight font-semibold">
                          <Link href={`/livros/${book.id}`} className="hover:underline">
                            {book.title}
                          </Link>
                        </h3>
                        <Stars rating={book.rating} />
                      </div>
                      {book.author && <p className="mt-0.5 text-sm text-graphite">{book.author}</p>}
                      {(finished || duration) && (
                        <p className="mt-2 text-xs text-graphite">
                          {[finished && `Terminado em ${finished}`, duration].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {book.review ? (
                        <p className="mt-3 line-clamp-3 font-serif text-lg leading-relaxed text-ink/80 italic">
                          “{book.review}”
                        </p>
                      ) : (
                        <Link
                          href={`/livros/${book.id}#resenha`}
                          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-dark hover:underline"
                        >
                          <PencilLine className="size-4" aria-hidden />
                          Escrever resenha
                        </Link>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
