import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookGrid, LibrarySkeleton } from "@/components/gallery/BookGrid";
import { ReadDiary } from "@/components/gallery/ReadDiary";
import { ShelfChips } from "@/components/gallery/ShelfChips";
import { listBookCards } from "@/lib/books/queries";
import { sortForShelf } from "@/lib/books/shelves";
import { SHELVES } from "@/types/book";

export default function PrateleiraPage({ params }: PageProps<"/estante/[shelf]">) {
  return (
    <Suspense fallback={<LibrarySkeleton hero={false} />}>
      <Prateleira params={params} />
    </Suspense>
  );
}

const EMPTY: Record<(typeof SHELVES)[number]["slug"], string> = {
  lendo: "Nenhuma leitura em andamento. Abra um livro da fila para começar.",
  "quero-ler": "Sua fila está vazia. Envie um PDF para guardar a próxima leitura.",
  lidos: "Quando terminar um livro, marque como Lido: ele aparece aqui com a sua resenha.",
  abandonados: "Nenhum livro abandonado. Ainda bem.",
};

async function Prateleira({ params }: Pick<PageProps<"/estante/[shelf]">, "params">) {
  const { shelf: slug } = await params;
  const shelf = SHELVES.find((s) => s.slug === slug);
  if (!shelf) notFound();

  const books = await listBookCards();
  const list = sortForShelf(
    books.filter((b) => b.status === shelf.status),
    shelf.status,
  );

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-5xl font-medium sm:text-6xl">{shelf.title}</h1>
        <p className="text-graphite">
          {list.length} {list.length === 1 ? "livro" : "livros"}
        </p>
      </header>
      <ShelfChips books={books} active={shelf.slug} />

      {list.length === 0 ? (
        <div className="rounded-[2rem] bg-paper-soft px-8 py-16 text-center">
          <p className="mx-auto max-w-md text-graphite">{EMPTY[shelf.slug]}</p>
          <Link
            href="/livros/novo"
            className="mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/30 hover:bg-white"
          >
            Enviar PDF
          </Link>
        </div>
      ) : shelf.slug === "lidos" ? (
        <ReadDiary books={list} />
      ) : (
        <BookGrid books={list} />
      )}
    </div>
  );
}
