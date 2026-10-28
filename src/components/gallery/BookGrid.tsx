import type { BookCard as BookCardData } from "@/types/book";
import { BookCard } from "./BookCard";

const GRID = "grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

interface BookGridProps {
  books: BookCardData[];
}

export function BookGrid({ books }: BookGridProps) {
  return (
    <ul className={GRID}>
      {books.map((book) => (
        <li key={book.id}>
          <BookCard book={book} variant="grid" />
        </li>
      ))}
    </ul>
  );
}

/** Placeholder das páginas da estante: destaque/título + prateleiras. */
export function LibrarySkeleton({ hero = true }: { hero?: boolean }) {
  return (
    <div className="animate-pulse space-y-14" aria-busy="true" aria-label="Carregando estante">
      {hero && (
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-4">
            <div className="h-16 w-3/4 rounded-lg bg-ink/10" />
            <div className="h-16 w-1/2 rounded-lg bg-ink/10" />
            <div className="h-5 w-2/3 rounded bg-ink/10" />
            <div className="h-12 w-44 rounded-full bg-ink/10" />
          </div>
          <div className="h-64 rounded-[2rem] bg-ink/5" />
        </div>
      )}
      <div className="flex gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-28 rounded-full bg-ink/10" />
        ))}
      </div>
      {[0, 1].map((shelf) => (
        <div key={shelf}>
          <div className="mb-5 h-9 w-48 rounded bg-ink/10" />
          <div className="flex gap-10 overflow-hidden px-6">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="aspect-[2/3] w-28 shrink-0 rounded bg-ink/10 sm:w-36" />
            ))}
          </div>
          <div className="mt-6 h-4 rounded-sm bg-wood/50" />
        </div>
      ))}
    </div>
  );
}
