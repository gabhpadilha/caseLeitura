import { Star } from "lucide-react";
import { BookCover } from "@/components/gallery/BookCover";
import { StatusBadge } from "@/components/gallery/StatusBadge";
import { formatRating } from "@/lib/books/format";
import { READING_STATUS_LABEL, type ReadingStatus } from "@/types/book";
import type { MemberBook } from "@/lib/books/queries";

/** Selo de estado; "Lido" ganha a nota quando a resenha foi compartilhada. */
function badgeLabel(book: MemberBook) {
  if (book.status === "finished" && book.rating) {
    return (
      <>
        Lido · <Star className="size-3 fill-current" aria-hidden /> {formatRating(book.rating)}
      </>
    );
  }
  return READING_STATUS_LABEL[book.status as ReadingStatus];
}

/**
 * Estante de outro leitor: capa, título, autor e estado. Sem link para ler ou
 * baixar: o conteúdo de cada livro é só de quem o enviou.
 */
export function MemberShelf({ books }: { books: MemberBook[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book) => (
        <li key={book.id}>
          <div className="relative">
            <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} seed={book.id} />
            <div className="absolute top-2 left-2">
              <StatusBadge status={book.status} size="sm" label={badgeLabel(book)} />
            </div>
          </div>
          <p className="mt-3 line-clamp-2 font-display text-lg leading-tight font-semibold">{book.title}</p>
          {book.author && <p className="mt-0.5 truncate text-sm text-graphite">{book.author}</p>}
          {book.kind === "comic" && <p className="mt-1 text-xs font-semibold text-coral-dark">Quadrinho</p>}
        </li>
      ))}
    </ul>
  );
}
