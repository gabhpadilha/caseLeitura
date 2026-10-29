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

/**
 * Ordem da estante geral do início: lendo (últimas leituras primeiro), depois
 * quero ler, lidos e abandonados — cada grupo na ordem da sua prateleira.
 */
export function sortForGallery(books: BookCard[]): BookCard[] {
  const order: ReadingStatus[] = ["reading", "to_read", "finished", "abandoned"];
  return order.flatMap((status) => sortForShelf(books.filter((b) => b.status === status), status));
}
