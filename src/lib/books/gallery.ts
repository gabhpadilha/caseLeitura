import { findCategory } from "@/lib/books/categories";
import { matchesQuery } from "@/lib/books/format";
import { sortForGallery, sortForShelf } from "@/lib/books/shelves";
import { SHELVES, type BookCard, type ShelfSlug } from "@/types/book";

// Filtros da página Livros. Vivem na URL (?estado=lidos&categoria=politica&ordem=titulo&q=…):
// o "voltar" do iPad funciona e a galeria reabre do jeito que ficou.

export const SORTS = [
  { slug: "recentes", label: "Recentes" },
  { slug: "titulo", label: "Título" },
  { slug: "autor", label: "Autor" },
  { slug: "nota", label: "Nota" },
] as const;

export type SortSlug = (typeof SORTS)[number]["slug"];

export interface GalleryFilters {
  /** Estado escolhido; null = todos. */
  shelf: (typeof SHELVES)[number] | null;
  /** Slug da categoria escolhida; null = todas. */
  category: string | null;
  sort: SortSlug;
  query: string;
}

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseGalleryFilters(params: Params): GalleryFilters {
  const sort = SORTS.find((s) => s.slug === first(params.ordem))?.slug ?? "recentes";
  return {
    shelf: SHELVES.find((s) => s.slug === first(params.estado)) ?? null,
    category: findCategory(first(params.categoria))?.slug ?? null,
    sort,
    query: first(params.q).trim(),
  };
}

/** URL da galeria com os filtros atuais trocados por `changes` (null remove). */
export function galleryHref(
  filters: GalleryFilters,
  changes: Partial<Record<"estado" | "categoria" | "ordem" | "q", string | null>> = {},
): string {
  const current = {
    estado: filters.shelf?.slug ?? null,
    categoria: filters.category,
    ordem: filters.sort === "recentes" ? null : filters.sort,
    q: filters.query || null,
  };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

const byQuery = (query: string) => (b: BookCard) => !query || matchesQuery(b, query);
const byShelf = (shelf: GalleryFilters["shelf"]) => (b: BookCard) => !shelf || b.status === shelf.status;
const byCategory = (category: string | null) => (b: BookCard) =>
  !category || b.categories.includes(category);

export interface GalleryView {
  books: BookCard[];
  /** Livros por estado, contando busca e categoria (o número ao lado de cada aba). */
  shelfCounts: Record<ShelfSlug | "todos", number>;
  /** Categorias usadas nos livros do estado escolhido, das mais comuns para as menos. */
  categoryCounts: { slug: string; count: number }[];
}

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

function sortBooks(books: BookCard[], filters: GalleryFilters): BookCard[] {
  switch (filters.sort) {
    case "titulo":
      return [...books].sort((a, b) => collator.compare(a.title, b.title));
    case "autor":
      // Sem autor vai para o fim.
      return [...books].sort(
        (a, b) =>
          Number(!a.author) - Number(!b.author) ||
          collator.compare(a.author ?? "", b.author ?? "") ||
          collator.compare(a.title, b.title),
      );
    case "nota":
      return [...books].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || collator.compare(a.title, b.title));
    default:
      return filters.shelf ? sortForShelf(books, filters.shelf.status) : sortForGallery(books);
  }
}

export function applyGalleryFilters(all: BookCard[], filters: GalleryFilters): GalleryView {
  const searched = all.filter(byQuery(filters.query));

  const inCategory = searched.filter(byCategory(filters.category));
  const shelfCounts = { todos: inCategory.length } as GalleryView["shelfCounts"];
  for (const s of SHELVES) shelfCounts[s.slug] = inCategory.filter(byShelf(s)).length;

  const tally = new Map<string, number>();
  for (const book of searched.filter(byShelf(filters.shelf))) {
    for (const slug of book.categories) tally.set(slug, (tally.get(slug) ?? 0) + 1);
  }
  const categoryCounts = [...tally]
    .filter(([slug]) => findCategory(slug))
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || collator.compare(findCategory(a.slug)!.label, findCategory(b.slug)!.label));

  return {
    books: sortBooks(inCategory.filter(byShelf(filters.shelf)), filters),
    shelfCounts,
    categoryCounts,
  };
}
