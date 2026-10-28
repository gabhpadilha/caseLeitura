// Fluxo de upload no browser: extrai → limpa → envia ao Storage → grava a linha.
import { extractPdfText, renderCover, type ExtractProgress } from "@/lib/pdf/extract";
import { createClient } from "@/lib/supabase/client";
import { BOOKS_BUCKET, bookStoragePaths, type Book } from "@/types/book";

export type UploadStage = "extracting" | "uploading" | "saving";

// O texto pode ser reprocessado: sem cache longo, o leitor sempre pega a versão nova.
const CONTENT_UPLOAD = { contentType: "text/plain; charset=utf-8", cacheControl: "0" };

export interface UploadBookInput {
  file: File;
  title?: string;
  author?: string;
  cover?: File | null;
}

export interface UploadCallbacks {
  onStage?: (stage: UploadStage) => void;
  onExtractProgress?: (p: ExtractProgress) => void;
}

export async function uploadBook(
  input: UploadBookInput,
  { onStage, onExtractProgress }: UploadCallbacks = {},
): Promise<Book> {
  const supabase = createClient();

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Faça login para enviar livros.");

  // 1. Extração local: falha rápido, antes de gastar upload.
  onStage?.("extracting");
  const extracted = await extractPdfText(input.file, onExtractProgress);
  const cover = input.cover ?? (await renderCover(input.file));

  // 2. Storage. O id é gerado aqui para montar os caminhos antes do insert.
  onStage?.("uploading");
  const bookId = crypto.randomUUID();
  const paths = bookStoragePaths(auth.user.id, bookId);
  const bucket = supabase.storage.from(BOOKS_BUCKET);

  const uploads = [
    bucket.upload(paths.pdf, input.file, { contentType: "application/pdf" }),
    extracted.hasTextLayer
      ? bucket.upload(paths.content, new Blob([extracted.text], { type: "text/plain" }), CONTENT_UPLOAD)
      : null,
    cover ? bucket.upload(paths.cover, cover, { contentType: cover.type || "image/webp" }) : null,
  ];
  const results = await Promise.all(uploads);
  const failed = results.find((r) => r?.error);
  if (failed?.error) {
    await bucket.remove(Object.values(paths));
    throw new Error(`Falha no upload: ${failed.error.message}`);
  }

  // 3. Linha no banco só depois dos arquivos: a galeria nunca vê livro pela metade.
  onStage?.("saving");
  const { data: book, error } = await supabase
    .from("books")
    .insert({
      id: bookId,
      title: input.title?.trim() || extracted.title || input.file.name.replace(/\.pdf$/i, ""),
      author: input.author?.trim() || extracted.author,
      pdf_path: paths.pdf,
      cover_path: cover ? paths.cover : null,
      content_path: extracted.hasTextLayer ? paths.content : null,
      // Sem camada de texto (PDF escaneado) → 'failed' até existir OCR.
      processing_status: extracted.hasTextLayer ? "ready" : "failed",
      page_count: extracted.pageCount,
      word_count: extracted.wordCount,
    })
    .select()
    .single();

  if (error) {
    await bucket.remove(Object.values(paths));
    throw new Error(`Falha ao salvar o livro: ${error.message}`);
  }
  return book;
}

/**
 * Refaz a extração a partir do PDF já guardado no Storage. Útil quando o
 * pipeline de limpeza melhora: o livro ganha o texto novo sem novo upload.
 */
export async function reprocessBook(
  book: Pick<Book, "id" | "pdf_path">,
  onExtractProgress?: (p: ExtractProgress) => void,
): Promise<void> {
  const supabase = createClient();

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Faça login para reprocessar o livro.");

  const bucket = supabase.storage.from(BOOKS_BUCKET);
  const { data: pdf, error: downloadError } = await bucket.download(book.pdf_path);
  if (downloadError || !pdf) throw new Error("Não foi possível baixar o PDF original.");

  const extracted = await extractPdfText(pdf, onExtractProgress);
  const paths = bookStoragePaths(auth.user.id, book.id);

  if (extracted.hasTextLayer) {
    const { error } = await bucket.upload(
      paths.content,
      new Blob([extracted.text], { type: "text/plain" }),
      { ...CONTENT_UPLOAD, upsert: true },
    );
    if (error) throw new Error(`Falha ao salvar o texto: ${error.message}`);
  }

  const { error } = await supabase
    .from("books")
    .update({
      content_path: extracted.hasTextLayer ? paths.content : null,
      processing_status: extracted.hasTextLayer ? "ready" : "failed",
      page_count: extracted.pageCount,
      word_count: extracted.wordCount,
    })
    .eq("id", book.id);
  if (error) throw new Error(`Falha ao atualizar o livro: ${error.message}`);
}
