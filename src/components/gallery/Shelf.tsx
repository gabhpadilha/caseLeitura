import Link from "next/link";
import type { BookCard as BookCardData } from "@/types/book";
import { BookCard } from "./BookCard";

interface ShelfProps {
  title: string;
  books: BookCardData[];
  /** Link "Ver prateleira →" para a página completa. */
  href: string;
}

/** Tábua de madeira da estante (topo claro, borda inferior mais escura). */
export function Plank() {
  return (
    <div
      aria-hidden
      className="h-4 rounded-sm border-b-[6px] border-wood-dark bg-wood shadow-[0_12px_16px_-10px_rgba(91,70,54,0.5)]"
    />
  );
}

/** Prateleira com rolagem horizontal e a tábua de madeira embaixo das capas. */
export function Shelf({ title, books, href }: ShelfProps) {
  if (books.length === 0) return null;

  return (
    <section aria-label={title}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-3xl font-medium sm:text-4xl">{title}</h2>
        <Link href={href} className="shrink-0 text-sm font-semibold text-coral-dark hover:underline">
          Ver prateleira →
        </Link>
      </div>
      <ul className="flex snap-x items-end gap-6 overflow-x-auto px-6 pt-2 pb-3 [scrollbar-width:none] sm:gap-10">
        {books.map((book) => (
          <li key={book.id} className="w-28 shrink-0 snap-start sm:w-36">
            <BookCard book={book} variant="shelf" />
          </li>
        ))}
      </ul>
      <Plank />
    </section>
  );
}
