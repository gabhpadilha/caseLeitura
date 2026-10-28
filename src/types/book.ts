import type { Enums, Tables, TablesInsert, TablesUpdate } from "./database";

// ---------------------------------------------------------------------------
// Entidades (derivadas do schema — uma única fonte de verdade)
// ---------------------------------------------------------------------------

export type ReadingStatus = Enums<"reading_status">;
export type ProcessingStatus = Enums<"processing_status">;

export type Book = Tables<"books">;
export type BookInsert = TablesInsert<"books">;
export type BookUpdate = TablesUpdate<"books">;

export type Review = Tables<"reviews">;
export type ReviewInsert = TablesInsert<"reviews">;

export type Note = Tables<"notes">;
export type NoteInsert = TablesInsert<"notes">;

/** Livro pronto para a galeria: capa já resolvida em signed URL. */
export interface BookCard
  extends Pick<
    Book,
    | "id"
    | "title"
    | "author"
    | "status"
    | "progress"
    | "processing_status"
    | "page_count"
    | "word_count"
    | "last_read_at"
    | "created_at"
    | "started_at"
    | "finished_at"
  > {
  coverUrl: string | null;
  /** Nota da resenha (1–5), se houver. */
  rating: number | null;
  /** Texto da resenha, se houver. */
  review: string | null;
}

/** Prateleiras da estante, com o slug usado na URL (/estante/[slug]). */
export const SHELVES = [
  { slug: "lendo", status: "reading", title: "Lendo agora", short: "Lendo" },
  { slug: "quero-ler", status: "to_read", title: "Quero ler", short: "Quero ler" },
  { slug: "lidos", status: "finished", title: "Lidos", short: "Lidos" },
  { slug: "abandonados", status: "abandoned", title: "Abandonados", short: "Abandonados" },
] as const satisfies readonly { slug: string; status: ReadingStatus; title: string; short: string }[];

export type ShelfSlug = (typeof SHELVES)[number]["slug"];

/** Dados da página do livro. */
export interface BookDetail {
  book: Book;
  coverUrl: string | null;
  /** Signed URL que força o download do PDF original. */
  pdfUrl: string | null;
  review: Review | null;
}

export const READING_STATUS_LABEL: Record<ReadingStatus, string> = {
  to_read: "Quero ler",
  reading: "Lendo",
  finished: "Lido",
  abandoned: "Abandonado",
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export const BOOKS_BUCKET = "books";

/** Caminhos de um livro no bucket. A 1ª pasta é o user_id (exigido pelo RLS). */
export function bookStoragePaths(userId: string, bookId: string) {
  const base = `${userId}/${bookId}`;
  return {
    pdf: `${base}/original.pdf`,
    cover: `${base}/cover.webp`,
    content: `${base}/content.txt`,
  } as const;
}
