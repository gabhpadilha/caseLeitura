import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { BancaSkeleton, ComicContinue, ComicRack, NEW_COMIC_HREF } from "@/components/comics/Banca";
import { getUserName, listBookCards } from "@/lib/books/queries";
import { sortForGallery, sortForShelf } from "@/lib/books/shelves";
import { SHELVES, type BookCard } from "@/types/book";

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
  const estado = Array.isArray(params.estado) ? params.estado[0] : params.estado;
  const shelf = SHELVES.find((s) => s.slug === estado) ?? null;
  const shown = sortForGallery(shelf ? comics.filter((c) => c.status === shelf.status) : comics);
  const tabs = [
    { slug: null, label: "Todos", count: comics.length },
    ...SHELVES.map((s) => ({ slug: s.slug, label: s.short, count: comics.filter((c) => c.status === s.status).length })),
  ];

  return (
    <div className="space-y-10">
      <ComicContinue name={name} comic={pickFeatured(comics)} />

      {comics.length > 0 && (
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <h1 className="font-display text-4xl font-medium sm:text-5xl">Meus quadrinhos</h1>
              <Link
                href={NEW_COMIC_HREF}
                aria-label="Enviar gibi"
                className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink/85"
              >
                <Plus className="size-4" aria-hidden />
                <span className="hidden sm:inline">Enviar gibi</span>
              </Link>
            </div>
            <nav
              aria-label="Filtrar por estado"
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pt-3 [scrollbar-width:none] sm:mx-0 sm:px-0"
            >
              {tabs.map((tab) => {
                const active = (shelf?.slug ?? null) === tab.slug;
                return (
                  <Link
                    key={tab.label}
                    href={tab.slug ? `/quadrinhos?estado=${tab.slug}` : "/quadrinhos"}
                    aria-current={active ? "page" : undefined}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      active ? "bg-ink text-paper" : "bg-paper-soft ring-1 ring-ink/10 hover:ring-ink/30"
                    }`}
                  >
                    {tab.label} <span className={active ? "text-paper/60" : "text-graphite"}>{tab.count}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {shown.length === 0 ? (
            <div className="rounded-[2rem] bg-paper-soft px-8 py-14 text-center">
              <p className="mx-auto max-w-md text-graphite">{EMPTY[shelf?.slug ?? ""] ?? "Nenhum gibi por aqui."}</p>
            </div>
          ) : (
            <ComicRack comics={shown} />
          )}
        </section>
      )}
    </div>
  );
}
