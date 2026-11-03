import Link from "next/link";
import { Star } from "lucide-react";
import { BookCover } from "@/components/gallery/BookCover";
import { relativeTime } from "@/lib/books/format";
import { Avatar } from "./Avatar";
import { Spoiler } from "./Spoiler";

interface ReviewPostProps {
  author: { id: string; name: string; mine: boolean };
  book: { id: string; title: string; author: string | null; coverUrl: string | null };
  rating: number | null;
  content: string;
  spoiler: boolean;
  sharedAt: string | null;
  /** Esconde o cabeçalho com o leitor (na estante de alguém, já se sabe de quem é). */
  hideAuthor?: boolean;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`size-4 text-coral ${n <= rating ? "fill-coral" : "opacity-30"}`} aria-hidden />
      ))}
    </span>
  );
}

/** Um post da timeline: quem, quando, o livro, a nota e a resenha (com spoiler escondido). */
export function ReviewPost({ author, book, rating, content, spoiler, sharedAt, hideAuthor = false }: ReviewPostProps) {
  // Seu próprio livro abre a página dele; o dos outros, a estante pública de quem resenhou.
  const bookHref = author.mine ? `/livros/${book.id}` : `/leitores/${author.id}`;
  const text = <p className="font-serif text-lg leading-relaxed whitespace-pre-line">{content}</p>;

  return (
    <article className="rounded-[2rem] bg-paper-soft p-5 shadow-[0_20px_40px_-34px_rgba(36,35,43,0.45)] ring-1 ring-ink/5 sm:p-7">
      {!hideAuthor && (
        <header className="mb-5 flex items-center gap-3">
          <Link href={`/leitores/${author.id}`} className="flex min-w-0 items-center gap-3">
            <Avatar name={author.name} seed={author.id} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{author.mine ? `${author.name} (você)` : author.name}</span>
              <span className="block text-xs text-graphite">
                resenhou{sharedAt && <> · {relativeTime(sharedAt)}</>}
              </span>
            </span>
          </Link>
        </header>
      )}

      <div className="flex gap-4 sm:gap-6">
        <Link href={bookHref} aria-label={book.title} className="shrink-0">
          <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} seed={book.id} className="w-20 sm:w-24" />
        </Link>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl leading-tight font-semibold">{book.title}</h3>
          {book.author && <p className="mt-0.5 text-sm text-graphite">{book.author}</p>}
          {rating && (
            <div className="mt-2">
              <Stars rating={rating} />
            </div>
          )}
          {hideAuthor && sharedAt && <p className="mt-2 text-xs text-graphite">{relativeTime(sharedAt)}</p>}
        </div>
      </div>

      <div className="mt-5">{spoiler ? <Spoiler>{text}</Spoiler> : text}</div>
    </article>
  );
}
