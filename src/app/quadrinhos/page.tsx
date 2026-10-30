import { Suspense } from "react";
import type { Metadata } from "next";
import { BancaSkeleton, ComicFeatured, ComicHero, ComicRack } from "@/components/comics/Banca";
import { getUserName, listBookCards } from "@/lib/books/queries";
import { sortForGallery, sortForShelf } from "@/lib/books/shelves";
import type { BookCard } from "@/types/book";

export const metadata: Metadata = { title: "Quadrinhos · caseLeitura" };

export default function QuadrinhosPage() {
  return (
    <Suspense fallback={<BancaSkeleton />}>
      <Banca />
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

async function Banca() {
  const [comics, name] = await Promise.all([listBookCards("comic"), getUserName()]);
  const featured = pickFeatured(comics);

  return (
    <>
      <ComicHero name={name} comics={comics} />
      <main className="mx-auto max-w-5xl space-y-12 px-5 pt-9 pb-[max(4rem,env(safe-area-inset-bottom))] sm:px-8">
        {featured && <ComicFeatured comic={featured} />}
        {comics.length === 0 && (
          <p className="relative mx-auto max-w-md rounded-[50%/45%] border-[3px] border-hq-ink bg-white px-8 py-5 text-center font-balloon text-xl font-bold">
            Sua banca está vazia! Toque na explosão e envie o seu primeiro gibi (PDF ou CBZ).
          </p>
        )}
        <ComicRack comics={sortForGallery(comics)} />
      </main>
    </>
  );
}
