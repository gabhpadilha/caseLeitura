import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookDetailView } from "@/components/book/BookDetailView";
import { getBookDetail } from "@/lib/books/queries";

export default function LivroPage({ params }: PageProps<"/livros/[bookId]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <LivroDetalhe params={params} />
    </Suspense>
  );
}

async function LivroDetalhe({ params }: Pick<PageProps<"/livros/[bookId]">, "params">) {
  const { bookId } = await params;
  const data = await getBookDetail(bookId);
  if (!data) notFound();

  return <BookDetailView data={data} />;
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando livro">
      <div className="h-4 w-24 rounded bg-ink/10" />
      <div className="mt-8 grid gap-10 sm:grid-cols-[auto_1fr] sm:items-center lg:gap-16">
        <div className="mx-auto aspect-[2/3] w-44 rounded bg-ink/10 sm:mx-0 lg:w-56" />
        <div className="space-y-4">
          <div className="h-12 w-3/4 rounded-lg bg-ink/10" />
          <div className="h-4 w-1/3 rounded bg-ink/10" />
          <div className="h-10 w-48 rounded-full bg-ink/10" />
        </div>
      </div>
    </div>
  );
}
