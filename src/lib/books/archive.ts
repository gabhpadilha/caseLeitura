// Arquivar e restaurar no browser: libera espaço no Storage sem perder a ficha do livro.
// Capa, resenha, progresso e status de leitura nunca são tocados.
import { extractPdfText, type ExtractProgress } from "@/lib/pdf/extract";
import { snapshotFile } from "@/lib/files/snapshot";
import { listParts, MAX_FILE_BYTES } from "@/lib/books/original";
import { assertQuotaFits } from "@/lib/books/quota";
import { friendlyUploadError, listFolder, saveExtraction, uploadOriginal } from "@/lib/books/upload";
import { createClient } from "@/lib/supabase/client";
import { BOOKS_BUCKET, bookFolder, isComic, type ArchiveLevel, type Book } from "@/types/book";

type Bucket = ReturnType<ReturnType<typeof createClient>["storage"]["from"]>;

type ArchivableBook = Pick<Book, "id" | "kind" | "pdf_path" | "content_path">;

/** Diferença de páginas (em proporção) acima da qual pedimos confirmação ao restaurar. */
const PAGE_MISMATCH_RATIO = 0.1;

/** O arquivamento 'full' vale só para livros de PDF: o restauro de quadrinhos só reenvia o original. */
export function canArchiveFully(book: Pick<Book, "kind">): boolean {
  return !isComic(book);
}

/**
 * Apaga do Storage o que o nível pede e marca a linha.
 *
 * Ordem: a linha é marcada PRIMEIRO. Assim, se a remoção dos arquivos falhar no meio,
 * o pior caso é sobrar arquivo ocupando espaço (basta arquivar de novo para concluir;
 * a operação é idempotente). O contrário, apagar e só depois marcar, poderia deixar
 * um livro "normal" na estante apontando para arquivos que já não existem.
 *
 * - 'original': o PDF/CBZ e todas as suas partes (`original.pdf.partNNN`).
 * - 'full' (só PDF): além disso `images/`, `pages/` e `content.txt`; `content_path` vira NULL.
 */
export async function archiveBook(book: ArchivableBook, level: ArchiveLevel): Promise<void> {
  if (level === "full" && !canArchiveFully(book)) {
    throw new Error("Quadrinhos só podem ter o arquivo original arquivado.");
  }
  const supabase = createClient();
  const bucket = supabase.storage.from(BOOKS_BUCKET);
  const folder = bookFolder(book.pdf_path);

  const { error } = await supabase
    .from("books")
    .update({
      archived_at: new Date().toISOString(),
      archive_level: level,
      ...(level === "full" && { content_path: null }),
    })
    .eq("id", book.id);
  if (error) throw new Error(`Não foi possível arquivar o livro: ${error.message}. Tente de novo.`);

  const targets = [book.pdf_path, ...(await listParts(bucket, book.pdf_path))];
  if (level === "full") {
    const [images, pages] = await Promise.all([
      listFolder(bucket, `${folder}/images`),
      listFolder(bucket, `${folder}/pages`),
    ]);
    targets.push(book.content_path ?? `${folder}/content.txt`, ...images, ...pages);
  }
  const { error: removeError } = await bucket.remove([...new Set(targets)]);
  if (removeError) {
    throw new Error(
      "O livro foi marcado como arquivado, mas não conseguimos apagar todos os arquivos. Abra Arquivar de novo para concluir.",
    );
  }
}

export interface ArchiveSavings {
  /** Bytes liberados arquivando só o original (e suas partes). */
  original: number;
  /** Bytes liberados no arquivamento completo (original + texto + ilustrações + páginas). */
  full: number;
}

/** Soma o tamanho dos objetos de uma pasta do bucket (sem subpastas). */
async function folderBytes(bucket: Bucket, folder: string, only?: (name: string) => boolean) {
  const { data } = await bucket.list(folder, { limit: 1000 });
  return (data ?? [])
    .filter((f) => f.id && (!only || only(f.name)))
    .reduce((sum, f) => sum + Number(f.metadata?.size ?? 0), 0);
}

/** Quanto cada nível de arquivamento libera, medido nos arquivos do Storage. */
export async function getArchiveSavings(book: Pick<Book, "pdf_path">): Promise<ArchiveSavings> {
  const bucket = createClient().storage.from(BOOKS_BUCKET);
  const folder = bookFolder(book.pdf_path);
  const name = book.pdf_path.slice(folder.length + 1);
  const [original, content, images, pages] = await Promise.all([
    folderBytes(bucket, folder, (n) => n === name || n.startsWith(`${name}.part`)),
    folderBytes(bucket, folder, (n) => n === "content.txt"),
    folderBytes(bucket, `${folder}/images`),
    folderBytes(bucket, `${folder}/pages`),
  ]);
  return { original, full: original + content + images + pages };
}

export interface PageMismatch {
  expected: number;
  found: number;
}

export interface RestoreCallbacks {
  onExtractProgress?: (p: ExtractProgress) => void;
  onStage?: (stage: "reading" | "uploading" | "saving") => void;
  /**
   * Chamado quando o nº de páginas do arquivo difere muito do livro. Devolva `true`
   * para continuar. Sem esta função, a diferença é recusada com uma mensagem.
   */
  confirmPageMismatch?: (info: PageMismatch) => Promise<boolean>;
}

/**
 * Restaura um livro arquivado a partir de um arquivo escolhido de novo, NO MESMO livro
 * (mesmos caminhos), preservando progresso, status e resenha.
 *
 * - PDF: lê o texto, reenvia original, ilustrações e content.txt e zera o arquivamento.
 * - Quadrinho: só existe o nível 'original'; basta reenviar o original (as páginas
 *   continuam no Storage). Restaurar quadrinho de nível 'full' não é suportado.
 */
export async function restoreBook(
  book: Pick<Book, "id" | "kind" | "pdf_path" | "page_count" | "archive_level">,
  input: File,
  { onExtractProgress, onStage, confirmPageMismatch }: RestoreCallbacks = {},
): Promise<void> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Faça login para restaurar o livro.");

  const comic = isComic(book);
  if (comic && book.archive_level === "full") {
    throw new Error("Este quadrinho não pode ser restaurado por aqui.");
  }
  const ext = book.pdf_path.split(".").pop() ?? "pdf";
  if (!new RegExp(`\\.${ext}$`, "i").test(input.name)) {
    throw new Error(`Escolha um arquivo ${ext.toUpperCase()}, o mesmo formato do original.`);
  }

  onStage?.("reading");
  const file = await snapshotFile(input);
  if (file.size > MAX_FILE_BYTES) {
    const mb = Math.round(file.size / 1024 / 1024);
    throw new Error(`Este arquivo tem ${mb} MB e o limite é ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  }
  await assertQuotaFits(file.size);

  const bucket = supabase.storage.from(BOOKS_BUCKET);
  const contentType = comic && ext === "cbz" ? "application/zip" : "application/pdf";
  const sendOriginal = async () => {
    const sent: string[] = [];
    const { error } = await uploadOriginal(bucket, book.pdf_path, file, contentType, sent);
    if (error) {
      await bucket.remove(sent);
      throw new Error(friendlyUploadError(error));
    }
  };
  const unarchive = { archived_at: null, archive_level: null } as const;

  // Quadrinho ou arquivamento só do original: o texto ainda está no Storage.
  if (comic || book.archive_level !== "full") {
    onStage?.("uploading");
    await sendOriginal();
    onStage?.("saving");
    const { error } = await supabase.from("books").update(unarchive).eq("id", book.id);
    if (error) throw new Error(`Falha ao atualizar o livro: ${error.message}`);
    return;
  }

  const extracted = await extractPdfText(file, onExtractProgress);
  if (book.page_count) {
    const diff = Math.abs(extracted.pageCount - book.page_count) / book.page_count;
    if (diff > PAGE_MISMATCH_RATIO) {
      const info = { expected: book.page_count, found: extracted.pageCount };
      if (!(await confirmPageMismatch?.(info))) {
        throw new Error(
          `Este PDF tem ${info.found} páginas e o livro tinha ${info.expected}. Parece ser outro arquivo; escolha o PDF certo.`,
        );
      }
    }
  }

  onStage?.("uploading");
  await sendOriginal();
  onStage?.("saving");
  await saveExtraction(supabase, auth.user.id, book.id, extracted, unarchive);
}
