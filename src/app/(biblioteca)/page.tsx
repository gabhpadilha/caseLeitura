import { Suspense } from "react";
import Link from "next/link";
import { ContinueReading } from "@/components/gallery/ContinueReading";
import { BookGrid, LibrarySkeleton } from "@/components/gallery/BookGrid";
import { Bookshelf } from "@/components/gallery/Bookshelf";
import { matchesQuery } from "@/lib/books/format";
import { getUserName, listBookCards } from "@/lib/books/queries";
import { sortForGallery, sortForShelf } from "@/lib/books/shelves";
import type { BookCard } from "@/types/book";

// O shell da página é pré-renderizado; a estante (dados por usuário) chega via streaming.
export default function InicioPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <Inicio searchParams={searchParams} />
    </Suspense>
  );
}

/** O último livro lido; se nenhum estiver em andamento, o mais recente da fila. */
function pickFeatured(books: BookCard[]): BookCard | null {
  const readable = books.filter((b) => b.processing_status === "ready");
  return (
    sortForShelf(readable.filter((b) => b.status === "reading"), "reading")[0] ??
    readable.find((b) => b.status === "to_read") ??
    null
  );
}

// Server Component assíncrono: busca no servidor, com o RLS filtrando pelo usuário logado.
async function Inicio({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const [{ q }, books, name] = await Promise.all([searchParams, listBookCards(), getUserName()]);
  const query = typeof q === "string" ? q.trim() : "";

  if (query) {
    const results = books.filter((b) => matchesQuery(b, query));
    return (
      <section>
        <h1 className="mb-10 font-display text-4xl font-medium">
          {results.length > 0 ? `Resultados para “${query}”` : `Nada encontrado para “${query}”`}
        </h1>
        {results.length > 0 ? (
          <BookGrid books={results} showStatus />
        ) : (
          <Link href="/" className="text-sm font-semibold text-coral-dark underline underline-offset-4">
            Voltar para a estante
          </Link>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-14">
      <ContinueReading name={name} book={pickFeatured(books)} />
      {books.length > 0 && (
        <section aria-labelledby="estante">
          <div className="mb-8 flex items-baseline justify-between gap-4">
            <h2 id="estante" className="font-display text-3xl font-medium sm:text-4xl">
              Sua estante
            </h2>
            <span className="text-graphite">
              {books.length} {books.length === 1 ? "livro" : "livros"}
            </span>
          </div>
          {/* Galeria geral: o estado de cada livro vai no selo da capa; a
              navegação por prateleira fica no trilho lateral. */}
          <Bookshelf books={sortForGallery(books)} />
        </section>
      )}
    </div>
  );
}
