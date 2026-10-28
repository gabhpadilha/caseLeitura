import type { BookCard, ReadingStatus } from "@/types/book";

/**
 * Ordem de cada prateleira:
 * - Lendo: últimas leituras primeiro (o que você abriu por último).
 * - Lidos/Abandonados: terminados mais recentemente primeiro.
 * - Quero ler: adicionados mais recentemente primeiro.
 */
export function sortForShelf(books: BookCard[], status: ReadingStatus): BookCard[] {
  const key = (b: BookCard) => {
    if (status === "reading") return b.last_read_at ?? b.created_at;
    if (status === "finished" || status === "abandoned") return b.finished_at ?? b.last_read_at ?? b.created_at;
    return b.created_at;
  };
  return [...books].sort((a, b) => key(b).localeCompare(key(a)));
}
