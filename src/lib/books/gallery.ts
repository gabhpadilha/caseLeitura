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
  /** Página da galeria (a sua, "/", ou a estante de um leitor). */
  basePath: string;
  /** Estado escolhido; null = todos. */
  shelf: (typeof SHELVES)[number] | null;
  /** Slug da categoria escolhida; null = todas. */
  category: string | null;
  sort: SortSlug;
  query: string;
}

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseGalleryFilters(params: Params, basePath = "/"): GalleryFilters {
  const sort = SORTS.find((s) => s.slug === first(params.ordem))?.slug ?? "recentes";
  return {
    basePath,
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
  return qs ? `${filters.basePath}?${qs}` : filters.basePath;
}

/** O mínimo para filtrar e ordenar: serve aos seus livros e à estante de outro leitor. */
export type GalleryItem = Pick<BookCard, "title" | "author" | "status" | "categories" | "rating">;

/** Ordem "Recentes" quando nenhuma outra foi escolhida. */
type RecentOrder<T> = (books: T[], shelf: GalleryFilters["shelf"]) => T[];

const byQuery = (query: string) => (b: GalleryItem) => !query || matchesQuery(b, query);
const byShelf = (shelf: GalleryFilters["shelf"]) => (b: GalleryItem) => !shelf || b.status === shelf.status;
const byCategory = (category: string | null) => (b: GalleryItem) =>
  !category || b.categories.includes(category);

export interface GalleryView<T extends GalleryItem = BookCard> {
  books: T[];
  /** Livros por estado, contando busca e categoria (o número ao lado de cada aba). */
  shelfCounts: Record<ShelfSlug | "todos", number>;
  /** Categorias usadas nos livros do estado escolhido, das mais comuns para as menos. */
  categoryCounts: { slug: string; count: number }[];
}

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

const bookRecent: RecentOrder<BookCard> = (books, shelf) =>
  shelf ? sortForShelf(books, shelf.status) : sortForGallery(books);

function sortBooks<T extends GalleryItem>(books: T[], filters: GalleryFilters, recent: RecentOrder<T>): T[] {
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
      return recent(books, filters.shelf);
  }
}

export function applyGalleryFilters(all: BookCard[], filters: GalleryFilters): GalleryView;
export function applyGalleryFilters<T extends GalleryItem>(
  all: T[],
  filters: GalleryFilters,
  recent: RecentOrder<T>,
): GalleryView<T>;
export function applyGalleryFilters<T extends GalleryItem>(
  all: T[],
  filters: GalleryFilters,
  recent: RecentOrder<T> = bookRecent as unknown as RecentOrder<T>,
): GalleryView<T> {
  const searched = all.filter(byQuery(filters.query));

  const inCategory = searched.filter(byCategory(filters.category));
  const shelfCounts = { todos: inCategory.length } as GalleryView<T>["shelfCounts"];
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
    books: sortBooks(inCategory.filter(byShelf(filters.shelf)), filters, recent),
    shelfCounts,
    categoryCounts,
  };
}
