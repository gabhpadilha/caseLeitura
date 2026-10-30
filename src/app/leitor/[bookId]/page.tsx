import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ComicReader } from "@/components/comics/ComicReader";
import { Reader } from "@/components/reader/Reader";
import { getComicPages, getReaderData } from "@/lib/books/queries";
import { isComic } from "@/types/book";

// Fora do grupo (biblioteca): o leitor ocupa a tela inteira, sem o header.
// A página não aguarda `params`; isso acontece dentro do Suspense.
export default function LeitorPage({ params }: PageProps<"/leitor/[bookId]">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-graphite">
          <Loader2 className="size-5 animate-spin" aria-label="Carregando livro" />
        </div>
      }
    >
      <LeitorLoader params={params} />
    </Suspense>
  );
}

async function LeitorLoader({ params }: Pick<PageProps<"/leitor/[bookId]">, "params">) {
  const { bookId } = await params;
  const data = await getReaderData(bookId);
  if (!data) notFound();

  // Quadrinho: páginas como imagens, sem texto.
  if (isComic(data.book)) {
    return <ComicReader book={data.book} pages={await getComicPages(data.book)} />;
  }

  return (
    <Reader
      book={data.book}
      contentUrl={data.contentUrl}
      imageUrls={data.imageUrls}
      initialSettings={data.settings}
    />
  );
}
