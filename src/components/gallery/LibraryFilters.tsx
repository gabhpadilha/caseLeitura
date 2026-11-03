import Form from "next/form";
import Link from "next/link";
import { ArrowDownUp, Check, Search, X } from "lucide-react";
import { findCategory } from "@/lib/books/categories";
import {
  SORTS,
  galleryHref,
  type GalleryFilters,
  type GalleryView,
} from "@/lib/books/gallery";
import { SHELVES } from "@/types/book";

interface LibraryFiltersProps {
  filters: GalleryFilters;
  view: GalleryView;
}

const chipRow =
  "-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0";

/** Busca + abas de estado + categorias + ordem. Tudo é link: funciona sem JS e no "voltar". */
export function LibraryFilters({ filters, view }: LibraryFiltersProps) {
  const tabs: { slug: string | null; label: string; count: number }[] = [
    { slug: null, label: "Todos", count: view.shelfCounts.todos },
    ...SHELVES.map((s) => ({
      slug: s.slug,
      label: s.short,
      count: view.shelfCounts[s.slug],
    })),
  ];
  // A categoria escolhida fica sempre visível (mesmo sem livros no estado atual).
  const categories = view.categoryCounts.filter(
    (c) => c.slug !== filters.category,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-medium sm:text-5xl">
          Meus livros
        </h1>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Form
            action="/"
            role="search"
            className="relative min-w-0 flex-1 sm:w-80"
          >
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-graphite"
              aria-hidden
            />
            <input
              key={filters.query}
              type="search"
              name="q"
              defaultValue={filters.query}
              placeholder="Buscar título ou autor"
              aria-label="Buscar livros"
              className="w-full rounded-full bg-paper-soft py-3 pr-4 pl-11 text-sm ring-1 ring-ink/10 outline-none placeholder:text-graphite/80 focus:ring-2 focus:ring-coral"
            />
            {filters.shelf && (
              <input type="hidden" name="estado" value={filters.shelf.slug} />
            )}
            {filters.category && (
              <input type="hidden" name="categoria" value={filters.category} />
            )}
            {filters.sort !== "recentes" && (
              <input type="hidden" name="ordem" value={filters.sort} />
            )}
          </Form>
          {/* No diário de lidos a ordem é a do término (agrupado por ano). */}
          {filters.shelf?.slug !== "lidos" && <SortMenu filters={filters} />}
        </div>
      </div>

      <nav aria-label="Filtrar por estado" className={`${chipRow} pt-3`}>
        {tabs.map((tab) => {
          const active = (filters.shelf?.slug ?? null) === tab.slug;
          return (
            <Link
              key={tab.label}
              href={galleryHref(filters, { estado: tab.slug })}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-ink text-paper"
                  : "bg-paper-soft ring-1 ring-ink/10 hover:ring-ink/30"
              }`}
            >
              {tab.label}{" "}
              <span className={active ? "text-paper/60" : "text-graphite"}>
                {tab.count}
              </span>
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Filtrar por categoria"
        className={`${chipRow} items-center`}
      >
        {(filters.category || categories.length > 0) && (
          <span className="shrink-0 text-xs font-semibold tracking-wider text-graphite uppercase">
            Categorias
          </span>
        )}
        {filters.category && (
          <Link
            href={galleryHref(filters, { categoria: null })}
            aria-label={`Remover filtro ${findCategory(filters.category)?.label}`}
            className="flex shrink-0 items-center gap-1 rounded-full bg-coral-soft px-3 py-1.5 text-sm font-semibold text-coral-dark ring-1 ring-coral/40"
          >
            {findCategory(filters.category)?.label}
            <X className="size-3.5" aria-hidden />
          </Link>
        )}
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={galleryHref(filters, { categoria: c.slug })}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm ring-1 ring-ink/15 transition-colors hover:bg-paper-soft"
          >
            {findCategory(c.slug)?.label}{" "}
            <span className="text-graphite">{c.count}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function SortMenu({ filters }: { filters: GalleryFilters }) {
  const current = SORTS.find((s) => s.slug === filters.sort)!;
  return (
    <details key={filters.sort} className="group relative shrink-0">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-paper-soft px-4 py-3 text-sm font-semibold ring-1 ring-ink/15 hover:bg-paper-soft [&::-webkit-details-marker]:hidden">
        <ArrowDownUp className="size-3.5" aria-hidden />
        <span className="sr-only">Ordenar por </span>
        {current.label}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl bg-paper-soft p-1.5 shadow-xl ring-1 ring-ink/10">
        {SORTS.map((s) => (
          <Link
            key={s.slug}
            href={galleryHref(filters, {
              ordem: s.slug === "recentes" ? null : s.slug,
            })}
            className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-ink/5"
          >
            {s.label}
            {s.slug === filters.sort && (
              <Check className="size-4 text-coral-dark" aria-hidden />
            )}
          </Link>
        ))}
      </div>
    </details>
  );
}
