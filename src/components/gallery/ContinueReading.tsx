import Link from "next/link";
import { ArrowUpRight, Upload } from "lucide-react";
import { estimatedPage, formatPercent } from "@/lib/books/format";
import type { BookCard } from "@/types/book";
import { BookCover } from "./BookCover";

interface ContinueReadingProps {
  name: string | null;
  /** Livro em destaque: o último lido, ou o próximo da fila. */
  book: BookCard | null;
}

export const continueCard =
  "flex items-center gap-5 rounded-[2rem] bg-paper-soft p-4 shadow-[0_20px_40px_-30px_rgba(36,35,43,0.4)] ring-1 ring-ink/5 sm:gap-7 sm:p-5 sm:pr-7";

/** Atalho do topo da galeria: volta direto para a leitura em andamento. */
export function ContinueReading({ name, book }: ContinueReadingProps) {
  if (!book) {
    return (
      <section className={continueCard}>
        <div className="min-w-0 flex-1 px-2 py-3">
          <p className="text-xs font-semibold tracking-widest text-coral-dark uppercase">
            Boa leitura{name ? `, ${name}` : ""}
          </p>
          <p className="mt-2 font-display text-2xl leading-snug font-medium sm:text-3xl">
            Sua estante está pronta. Envie um PDF e ele vira um livro de verdade aqui.
          </p>
        </div>
        <Link
          href="/livros/novo"
          className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper hover:bg-ink/85"
        >
          <Upload className="size-4" aria-hidden />
          <span className="hidden sm:inline">Enviar PDF</span>
        </Link>
      </section>
    );
  }

  const started = book.progress > 0;
  const page = estimatedPage(book.progress, book.page_count);

  return (
    <section className={continueCard}>
      <Link href={`/livros/${book.id}`} aria-label={`Página de ${book.title}`} className="shrink-0">
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          seed={book.id}
          className="w-16 sm:w-20"
        />
      </Link>
      <Link href={`/leitor/${book.id}`} className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-widest text-coral-dark uppercase">
          {started ? "Continuar lendo" : "Próxima leitura"}
        </p>
        <h2 className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">{book.title}</h2>
        <p className="truncate text-sm text-graphite">
          {[book.author, page && book.page_count ? `página ${page} de ${book.page_count}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {started && (
          <div className="mt-2.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-coral" style={{ width: `${book.progress}%` }} />
          </div>
        )}
      </Link>
      <Link
        href={`/leitor/${book.id}`}
        className="hidden shrink-0 items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:bg-ink/85 sm:flex"
      >
        {started ? `Abrir · ${formatPercent(book.progress)}` : "Começar a ler"}
        <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
