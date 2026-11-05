// Espaço de armazenamento por pessoa (plano gratuito do Supabase): consulta e formatação.
import { createClient } from "@/lib/supabase/client";

/** Cota por usuário. Espelha storage_quota_bytes() do banco: se mudar lá, mude aqui. */
export const STORAGE_QUOTA_BYTES = 100 * 1024 * 1024;

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

export interface BookSize {
  bookId: string;
  bytes: number;
}

/** Espaço usado e cota. `null` se a consulta falhar (quem chama segue em frente). */
export async function getStorageUsage(): Promise<StorageUsage | null> {
  const { data, error } = await createClient().rpc("my_storage_usage");
  const row = data?.[0];
  if (error || !row) return null;
  return { usedBytes: Number(row.used_bytes), quotaBytes: Number(row.quota_bytes) || STORAGE_QUOTA_BYTES };
}

/** Tamanho de cada livro no Storage, por id. Vazio se a consulta falhar. */
export async function getBookSizes(): Promise<BookSize[]> {
  const { data, error } = await createClient().rpc("my_book_sizes");
  if (error || !data) return [];
  return data.map((r) => ({ bookId: r.book_id, bytes: Number(r.bytes) }));
}

/** "1,5 MB", "820 kB", "0 kB": base 1024, vírgula decimal. */
export function formatBytes(bytes: number): string {
  const format = (n: number, digits: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits });
  if (bytes >= 1024 * 1024 * 1024) return `${format(bytes / 1024 ** 3, 1)} GB`;
  if (bytes >= 1024 * 1024) return `${format(bytes / 1024 ** 2, bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${format(Math.round(bytes / 1024), 0)} kB`;
}

/** Erro amigável quando o arquivo não cabe no espaço que sobra; `null` se couber. */
export function quotaExceededMessage(usage: StorageUsage, incomingBytes: number): string | null {
  if (usage.usedBytes + incomingBytes <= usage.quotaBytes) return null;
  const missing = usage.usedBytes + incomingBytes - usage.quotaBytes;
  return (
    `Seu espaço está cheio (${formatBytes(usage.usedBytes)} de ${formatBytes(usage.quotaBytes)}). ` +
    `Faltam ${formatBytes(missing)} para este arquivo. Arquive livros já lidos para liberar espaço.`
  );
}

/** Confere a cota antes de gastar leitura e envio. Se a consulta falhar, o freio do banco protege. */
export async function assertQuotaFits(incomingBytes: number): Promise<void> {
  const usage = await getStorageUsage();
  const message = usage && quotaExceededMessage(usage, incomingBytes);
  if (message) throw new Error(message);
}
