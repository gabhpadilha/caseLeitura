import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BancaSkeleton, ComicContinue, ComicRack } from "@/components/comics/Banca";
import { LibraryFilters } from "@/components/gallery/LibraryFilters";
import { applyGalleryFilters, galleryHref, parseGalleryFilters } from "@/lib/books/gallery";
import { getUserName, listBookCards } from "@/lib/books/queries";
import { sortForShelf } from "@/lib/books/shelves";
import type { BookCard } from "@/types/book";

export const metadata: Metadata = { title: "Quadrinhos · caseLeitura" };

export default function QuadrinhosPage({ searchParams }: PageProps<"/quadrinhos">) {
  return (
    <Suspense fallback={<BancaSkeleton />}>
      <Banca searchParams={searchParams} />
    </Suspense>
  );
}

/** O gibi da última leitura; sem nenhum em andamento, o mais recente da fila. */
function pickFeatured(comics: BookCard[]): BookCard | null {
  return (
    sortForShelf(comics.filter((c) => c.status === "reading"), "reading")[0] ??
    comics.find((c) => c.status === "to_read") ??
    null
  );
}

const EMPTY: Record<string, string> = {
  lendo: "Nenhum gibi em andamento.",
  "quero-ler": "Nada na fila. Envie o próximo gibi.",
  lidos: "Quando terminar um gibi, marque como Lido e ele aparece aqui.",
  abandonados: "Nenhum gibi abandonado.",
};

async function Banca({ searchParams }: Pick<PageProps<"/quadrinhos">, "searchParams">) {
  const [params, comics, name] = await Promise.all([searchParams, listBookCards("comic"), getUserName()]);
  // Mesmos filtros da página Livros (estado, ordem e busca na URL), sem categorias.
  const filters = parseGalleryFilters(params, "/quadrinhos");
  const view = applyGalleryFilters(comics, filters);

  return (
    <div className="space-y-10">
      <ComicContinue name={name} comic={pickFeatured(comics)} />

      {comics.length > 0 && (
        <section className="space-y-6">
          <LibraryFilters filters={filters} view={view} title="Meus quadrinhos" categories={false} sortOnRead />
          {filters.query && (
            <p className="text-sm text-graphite">
              {view.books.length} {view.books.length === 1 ? "gibi" : "gibis"} para “{filters.query}”
            </p>
          )}

          {view.books.length === 0 ? (
            <div className="rounded-[2rem] bg-paper-soft px-8 py-14 text-center">
              <p className="mx-auto max-w-md text-graphite">
                {filters.query
                  ? "Nenhum gibi com essa busca."
                  : (EMPTY[filters.shelf?.slug ?? ""] ?? "Nenhum gibi por aqui.")}
              </p>
              {filters.query && (
                <Link
                  href={galleryHref(filters, { q: null })}
                  className="mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/30 hover:bg-white"
                >
                  Limpar busca
                </Link>
              )}
            </div>
          ) : (
            <ComicRack comics={view.books} />
          )}
        </section>
      )}
    </div>
  );
}
