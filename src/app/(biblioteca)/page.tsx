import { Suspense } from "react";
import Link from "next/link";
import { ContinueReading } from "@/components/gallery/ContinueReading";
import { BookGrid, LibrarySkeleton } from "@/components/gallery/BookGrid";
import { LibraryFilters } from "@/components/gallery/LibraryFilters";
import { ReadDiary } from "@/components/gallery/ReadDiary";
import { findCategory } from "@/lib/books/categories";
import { applyGalleryFilters, galleryHref, parseGalleryFilters, type GalleryFilters } from "@/lib/books/gallery";
import { getUserName, listBookCards } from "@/lib/books/queries";
import { sortForShelf } from "@/lib/books/shelves";
import type { BookCard } from "@/types/book";

// O shell da página é pré-renderizado; a estante (dados por usuário) chega via streaming.
export default function LivrosPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <Livros searchParams={searchParams} />
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

const EMPTY: Record<string, string> = {
  lendo: "Nenhuma leitura em andamento. Abra um livro da fila para começar.",
  "quero-ler": "Sua fila está vazia. Envie um PDF para guardar a próxima leitura.",
  lidos: "Quando terminar um livro, marque como Lido: ele aparece aqui com a sua resenha.",
  abandonados: "Nenhum livro abandonado. Ainda bem.",
};

/** Frase do resultado: "5 livros em Política", "Nada encontrado para “x”"… */
function Summary({ count, filters }: { count: number; filters: GalleryFilters }) {
  const category = findCategory(filters.category)?.label;
  if (!filters.query && !category) return null;
  return (
    <p className="text-sm text-graphite">
      {count} {count === 1 ? "livro" : "livros"}
      {category && (
        <>
          {" "}
          em <b className="text-ink">{category}</b>
        </>
      )}
      {filters.query && <> para “{filters.query}”</>}
    </p>
  );
}

// Server Component assíncrono: busca no servidor, com o RLS filtrando pelo usuário logado.
async function Livros({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const [params, books, name] = await Promise.all([searchParams, listBookCards(), getUserName()]);
  const filters = parseGalleryFilters(params);
  const view = applyGalleryFilters(books, filters);
  const filtered = Boolean(filters.query || filters.category);

  return (
    <div className="space-y-10">
      <ContinueReading name={name} book={pickFeatured(books)} />

      {books.length > 0 && (
        <section className="space-y-6">
          <LibraryFilters filters={filters} view={view} />
          <Summary count={view.books.length} filters={filters} />

          {view.books.length === 0 ? (
            <div className="rounded-[2rem] bg-paper-soft px-8 py-14 text-center">
              <p className="mx-auto max-w-md text-graphite">
                {filtered
                  ? "Nenhum livro com esses filtros."
                  : EMPTY[filters.shelf?.slug ?? ""] ?? "Nenhum livro por aqui."}
              </p>
              {filtered && (
                <Link
                  href={galleryHref(filters, { q: null, categoria: null })}
                  className="mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/30 hover:bg-white"
                >
                  Limpar busca e categoria
                </Link>
              )}
            </div>
          ) : filters.shelf?.slug === "lidos" ? (
            <ReadDiary books={view.books} />
          ) : (
            <BookGrid books={view.books} showStatus={!filters.shelf} />
          )}
        </section>
      )}
    </div>
  );
}
