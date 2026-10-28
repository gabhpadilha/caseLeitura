import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { estimatedPage, formatPercent, remainingPages } from "@/lib/books/format";
import type { BookCard } from "@/types/book";
import { BookCover } from "./BookCover";
import { StatusBadge } from "./StatusBadge";

interface ContinueReadingProps {
  name: string | null;
  /** Livro em destaque: o último lido, ou o próximo da fila. */
  book: BookCard | null;
}

function Message({ book }: { book: BookCard | null }) {
  if (!book) return <>Sua estante está pronta. Envie um PDF e ele vira um livro de verdade aqui.</>;
  if (book.progress === 0) {
    return (
      <>
        <em>{book.title}</em> está esperando por você. Que tal começar hoje?
      </>
    );
  }
  const left = remainingPages(book.progress, book.page_count);
  if (left) {
    return (
      <>
        Faltam {left} páginas para você descobrir o resto de <em>{book.title}</em>.
      </>
    );
  }
  return (
    <>
      Você está em {formatPercent(book.progress)} de <em>{book.title}</em>. Que tal mais algumas
      páginas?
    </>
  );
}

export function ContinueReading({ name, book }: ContinueReadingProps) {
  const started = book !== null && book.progress > 0;
  const page = book ? estimatedPage(book.progress, book.page_count) : null;

  return (
    <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
      <div>
        <h1 className="font-display text-5xl leading-[1.02] font-medium sm:text-6xl lg:text-7xl">
          Boa leitura{name ? "," : ""}
          {name && (
            <>
              <br />
              <em className="font-medium">{name}</em>
            </>
          )}
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-graphite">
          <Message book={book} />
        </p>
        <Link
          href={book ? `/leitor/${book.id}` : "/livros/novo"}
          className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-3.5 font-medium text-paper transition-colors hover:bg-ink/85"
        >
          {!book ? "Enviar PDF" : started ? "Continuar lendo" : "Começar a ler"}
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>

      {book && (
        <Link
          href={`/livros/${book.id}`}
          className="flex items-center gap-6 rounded-[2rem] bg-paper-soft p-6 shadow-[0_20px_40px_-30px_rgba(36,35,43,0.4)] transition-shadow hover:shadow-[0_24px_48px_-28px_rgba(36,35,43,0.5)] sm:gap-10 sm:p-10"
        >
          <BookCover
            title={book.title}
            author={book.author}
            coverUrl={book.coverUrl}
            seed={book.id}
            className="w-28 shrink-0 sm:w-44"
          />
          <div className="min-w-0 flex-1">
            <StatusBadge status={book.status} label={started ? "Lendo agora" : "Próxima leitura"} />
            <h2 className="mt-4 line-clamp-3 font-display text-3xl leading-tight font-medium sm:text-4xl">
              {book.title}
            </h2>
            {book.author && <p className="mt-2 text-graphite">{book.author}</p>}
            <div className="mt-6 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-coral-dark">
                {page && book.page_count ? page : formatPercent(book.progress)}
              </span>
              {book.page_count && <span className="text-graphite">de {book.page_count} páginas</span>}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-coral" style={{ width: `${book.progress}%` }} />
            </div>
          </div>
        </Link>
      )}
    </section>
  );
}
