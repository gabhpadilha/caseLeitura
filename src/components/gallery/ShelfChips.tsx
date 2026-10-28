import Link from "next/link";
import { SHELVES, type BookCard, type ShelfSlug } from "@/types/book";

interface ShelfChipsProps {
  books: BookCard[];
  /** Prateleira atual; null = "Todos" (início). */
  active: ShelfSlug | null;
}

/** Filtros "Todos · Lendo · Quero ler · Lidos" com a contagem de cada um. */
export function ShelfChips({ books, active }: ShelfChipsProps) {
  const chips = [
    { href: "/", label: "Todos", count: books.length, current: active === null },
    ...SHELVES.map((s) => ({
      href: `/estante/${s.slug}`,
      label: s.short,
      count: books.filter((b) => b.status === s.status).length,
      current: active === s.slug,
    })).filter((c) => c.count > 0 || c.current || c.label !== "Abandonados"),
  ];

  return (
    <nav aria-label="Prateleiras" className="flex flex-wrap gap-2.5">
      {chips.map((chip) => (
        <Link
          key={chip.href}
          href={chip.href}
          aria-current={chip.current ? "page" : undefined}
          className={`rounded-full px-5 py-2.5 text-sm transition-colors ${
            chip.current
              ? "bg-ink font-semibold text-paper"
              : "bg-paper-soft text-ink ring-1 ring-ink/5 hover:bg-white"
          }`}
        >
          {chip.label} · {chip.count}
        </Link>
      ))}
    </nav>
  );
}
