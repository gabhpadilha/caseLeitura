import type { BookCard as BookCardData } from "@/types/book";
import { BookCard } from "./BookCard";

const GRID = "grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

interface BookGridProps {
  books: BookCardData[];
  /** Mini tag de estado sobre as capas (útil quando a grade mistura estados). */
  showStatus?: boolean;
}

export function BookGrid({ books, showStatus = false }: BookGridProps) {
  return (
    <ul className={GRID}>
      {books.map((book) => (
        <li key={book.id}>
          <BookCard book={book} variant="grid" showStatus={showStatus} />
        </li>
      ))}
    </ul>
  );
}

/** Placeholder da página Livros: atalho de leitura, filtros e grade. */
export function LibrarySkeleton() {
  return (
    <div className="animate-pulse space-y-10" aria-busy="true" aria-label="Carregando estante">
      <div className="h-32 rounded-[2rem] bg-ink/5" />
      <div className="space-y-4">
        <div className="h-12 w-60 rounded-lg bg-ink/10" />
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-ink/10" />
          ))}
        </div>
      </div>
      <div className={GRID}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] rounded bg-ink/10" />
            <div className="mt-3 h-4 w-3/4 rounded bg-ink/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
