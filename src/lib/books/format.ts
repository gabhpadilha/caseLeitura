import type { BookCard } from "@/types/book";

const TIME_ZONE = "America/Sao_Paulo";
const WORDS_PER_MINUTE = 230;

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  // Datas puras ("2026-10-28") viram meia-noite local, não UTC.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: TIME_ZONE }).format(date);
}

/** Tempo estimado para ler o livro inteiro, a ~230 palavras por minuto. */
export function readingTime(words: number | null): string | null {
  if (!words) return null;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Página aproximada do PDF original correspondente ao progresso. */
export function estimatedPage(progress: number, pageCount: number | null): number | null {
  if (!pageCount) return null;
  return Math.min(pageCount, Math.max(1, Math.round((progress / 100) * pageCount)));
}

export function formatPercent(progress: number): string {
  return `${Math.round(progress)}%`;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Busca por título ou autor, sem diferenciar acentos nem maiúsculas. */
export function matchesQuery(book: Pick<BookCard, "title" | "author">, query: string): boolean {
  const q = normalize(query.trim());
  return normalize(`${book.title} ${book.author ?? ""}`).includes(q);
}

/** Nota no formato do design: "4,0", "3,5". */
export function formatRating(rating: number): string {
  return rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Duração da leitura ("levou 9 dias"), se as duas datas existirem. */
export function readingDuration(startedAt: string | null, finishedAt: string | null): string | null {
  if (!startedAt || !finishedAt) return null;
  const days = Math.round(
    (new Date(`${finishedAt}T12:00:00`).getTime() - new Date(`${startedAt}T12:00:00`).getTime()) /
      86_400_000,
  );
  if (days < 0) return null;
  if (days === 0) return "lido em um dia";
  if (days < 14) return `levou ${days} ${days === 1 ? "dia" : "dias"}`;
  if (days < 60) return `levou ${Math.round(days / 7)} semanas`;
  return `levou ${Math.round(days / 30)} meses`;
}

/** Páginas que faltam para terminar, pelo progresso e pelo total do PDF. */
export function remainingPages(progress: number, pageCount: number | null): number | null {
  const current = estimatedPage(progress, pageCount);
  return current && pageCount ? Math.max(0, pageCount - current) : null;
}
