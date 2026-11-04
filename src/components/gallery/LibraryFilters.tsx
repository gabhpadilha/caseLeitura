import Form from "next/form";
import Link from "next/link";
import { ArrowDownUp, Check, Search, X } from "lucide-react";
import { findCategory } from "@/lib/books/categories";
import { SORTS, galleryHref, type GalleryFilters, type GalleryItem, type GalleryView } from "@/lib/books/gallery";
import { SHELVES } from "@/types/book";
import { FilterSheet } from "./FilterSheet";

interface LibraryFiltersProps {
  filters: GalleryFilters;
  view: GalleryView<GalleryItem>;
  /** Título ao lado da busca ("Meus livros"; na estante de outro leitor, "Estante"). */
  title?: string;
  /** Galeria de outro leitor: título em h2 e sem a dica de editar categorias. */
  member?: boolean;
  /** Filtro de categoria (os quadrinhos ainda não têm categorias). */
  categories?: boolean;
  /** Ordem também na aba Lidos (na página Livros ela vira o diário, por data de término). */
  sortOnRead?: boolean;
}

const chipRow = "-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0";

/** Busca + abas de estado + categorias + ordem. Tudo é link: funciona sem JS e no "voltar". */
export function LibraryFilters({
  filters,
  view,
  title = "Meus livros",
  member = false,
  categories: withCategories = true,
  sortOnRead = member,
}: LibraryFiltersProps) {
  const Heading = member ? "h2" : "h1";
  const tabs: Tab[] = [
    { slug: null, label: "Todos", count: view.shelfCounts.todos },
    ...SHELVES.map((s) => ({
      slug: s.slug,
      label: s.short,
      count: view.shelfCounts[s.slug],
    })),
  ];
  // A categoria escolhida fica sempre visível (mesmo sem livros no estado atual).
  const categories = view.categoryCounts.filter((c) => c.slug !== filters.category);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Heading className="font-display text-4xl font-medium sm:text-5xl">{title}</Heading>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Form action={filters.basePath} role="search" className="relative min-w-0 flex-1 sm:w-80">
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
            {filters.shelf && <input type="hidden" name="estado" value={filters.shelf.slug} />}
            {filters.category && <input type="hidden" name="categoria" value={filters.category} />}
            {filters.sort !== "recentes" && <input type="hidden" name="ordem" value={filters.sort} />}
          </Form>
          {/* No diário de lidos a ordem é a do término (agrupado por ano). */}
          {(sortOnRead || filters.shelf?.slug !== "lidos") && (
            <div className="hidden sm:block">
              <SortMenu filters={filters} />
            </div>
          )}
        </div>
      </div>

      <MobileFilters
        filters={filters}
        view={view}
        tabs={tabs}
        member={member}
        categories={withCategories}
        sortOnRead={sortOnRead}
      />

      <nav aria-label="Filtrar por estado" className={`${chipRow} hidden pt-3 sm:flex`}>
        {tabs.map((tab) => {
          const active = (filters.shelf?.slug ?? null) === tab.slug;
          return (
            <Link
              key={tab.label}
              href={galleryHref(filters, { estado: tab.slug })}
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

      {withCategories && (
        <nav aria-label="Filtrar por categoria" className={`${chipRow} hidden items-center sm:flex`}>
          {(filters.category || categories.length > 0) && (
            <span className="shrink-0 text-xs font-semibold tracking-wider text-graphite uppercase">Categorias</span>
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
              {findCategory(c.slug)?.label} <span className="text-graphite">{c.count}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

type Tab = { slug: string | null; label: string; count: number };

const sheetOption = "flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-base hover:bg-ink/5";

function OptionMark({ on }: { on: boolean }) {
  return on ? <Check className="size-5 shrink-0 text-coral-dark" aria-hidden /> : null;
}

/** Celular: três botões numa linha (estado, categoria, ordem), cada um abre uma folha de opções. */
function MobileFilters({ filters, view, tabs, member, categories, sortOnRead }: LibraryFiltersProps & { tabs: Tab[] }) {
  const shelf = tabs.find((t) => t.slug === (filters.shelf?.slug ?? null))!;
  const category = findCategory(filters.category);
  const sort = SORTS.find((s) => s.slug === filters.sort)!;
  const showSort = sortOnRead || filters.shelf?.slug !== "lidos";

  return (
    <div className="flex gap-2 pt-1 sm:hidden">
      <FilterSheet
        caption="Estado"
        label={`${shelf.label} · ${shelf.count}`}
        active={!!filters.shelf}
        title="Estado da leitura"
      >
        {tabs.map((tab) => (
          <Link key={tab.label} href={galleryHref(filters, { estado: tab.slug })} className={sheetOption}>
            <span>
              {tab.label} <span className="text-graphite">{tab.count}</span>
            </span>
            <OptionMark on={tab.slug === shelf.slug} />
          </Link>
        ))}
      </FilterSheet>

      {categories && (
        <FilterSheet caption="Categoria" label={category?.label ?? "Todas"} active={!!category} title="Categoria">
          <Link href={galleryHref(filters, { categoria: null })} className={sheetOption}>
            Todas as categorias
            <OptionMark on={!category} />
          </Link>
          {category && !view.categoryCounts.some((c) => c.slug === category.slug) && (
            <Link href={galleryHref(filters, { categoria: category.slug })} className={sheetOption}>
              {category.label} <OptionMark on />
            </Link>
          )}
          {view.categoryCounts.map((c) => (
            <Link key={c.slug} href={galleryHref(filters, { categoria: c.slug })} className={sheetOption}>
              <span>
                {findCategory(c.slug)?.label} <span className="text-graphite">{c.count}</span>
              </span>
              <OptionMark on={c.slug === filters.category} />
            </Link>
          ))}
          {view.categoryCounts.length === 0 && (
            <p className="px-4 py-3 text-sm text-graphite">
              {member
                ? "Nenhum livro com categoria nesta estante."
                : "Nenhum livro com categoria ainda. Escolha as categorias na página de cada livro."}
            </p>
          )}
        </FilterSheet>
      )}

      {showSort && (
        <FilterSheet
          caption="Ordem"
          label={sort.label}
          active={filters.sort !== "recentes"}
          title="Ordenar por"
          icon={<ArrowDownUp className="size-5" aria-hidden />}
        >
          {SORTS.map((s) => (
            <Link
              key={s.slug}
              href={galleryHref(filters, { ordem: s.slug === "recentes" ? null : s.slug })}
              className={sheetOption}
            >
              {s.label}
              <OptionMark on={s.slug === filters.sort} />
            </Link>
          ))}
        </FilterSheet>
      )}
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
            {s.slug === filters.sort && <Check className="size-4 text-coral-dark" aria-hidden />}
          </Link>
        ))}
      </div>
    </details>
  );
}
