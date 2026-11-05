// Arquivo original em partes: o Storage gratuito recusa objetos acima de 50 MB, então
// arquivos grandes são cortados em pedaços, enviados em separado e juntados na leitura.
// Cortar e colar bytes não altera o arquivo: PDF e CBZ voltam idênticos ao original.
import type { createClient } from "@/lib/supabase/client";

type Bucket = ReturnType<ReturnType<typeof createClient>["storage"]["from"]>;
type ListingBucket = Pick<Bucket, "list" | "download">;

/** Tamanho de cada parte: abaixo do limite de 50 MB do Storage, com folga. */
export const PART_BYTES = 45 * 1024 * 1024;

/** Maior arquivo aceito (a leitura roda no aparelho e usa memória). */
export const MAX_FILE_BYTES = 250 * 1024 * 1024;

/** Caminho da parte `i` (0 = primeira): `original.pdf.part001`, `.part002`… */
export function partPath(path: string, i: number): string {
  return `${path}.part${String(i + 1).padStart(3, "0")}`;
}

/** Corta o arquivo em partes de até PART_BYTES (sem copiar: são fatias do mesmo arquivo). */
export function splitInParts(file: Blob): Blob[] {
  const parts: Blob[] = [];
  for (let start = 0; start < file.size; start += PART_BYTES) {
    parts.push(file.slice(start, start + PART_BYTES));
  }
  return parts;
}

/** Caminhos das partes de um original, em ordem. Vazio se ele foi enviado inteiro. */
export async function listParts(bucket: ListingBucket, path: string): Promise<string[]> {
  const slash = path.lastIndexOf("/");
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data } = await bucket.list(folder, { limit: 1000, search: name });
  return (data ?? [])
    .filter((f) => f.id && f.name.startsWith(`${name}.part`))
    .map((f) => `${folder}/${f.name}`)
    .sort();
}

/** Baixa o original, inteiro ou juntando as partes. `null` se não existir. */
export async function downloadOriginal(bucket: ListingBucket, path: string): Promise<Blob | null> {
  const whole = await bucket.download(path);
  if (whole.data) return whole.data;

  const parts = await listParts(bucket, path);
  if (parts.length === 0) return null;
  const blobs: Blob[] = [];
  for (const part of parts) {
    const { data, error } = await bucket.download(part);
    if (error || !data) return null;
    blobs.push(data);
  }
  return new Blob(blobs, { type: path.endsWith(".cbz") ? "application/zip" : "application/pdf" });
}
