// Fluxo de upload no browser: extrai → limpa → envia ao Storage → grava a linha.
import {
  extractPdfText,
  renderCover,
  type ExtractedImage,
  type ExtractProgress,
} from "@/lib/pdf/extract";
import { normalizeCategories } from "@/lib/books/categories";
import { snapshotFile } from "@/lib/files/snapshot";
import { downloadOriginal, MAX_FILE_BYTES, partPath, splitInParts, PART_BYTES } from "@/lib/books/original";
import { createClient } from "@/lib/supabase/client";
import { BOOKS_BUCKET, bookStoragePaths, type Book } from "@/types/book";

export type UploadStage = "extracting" | "uploading" | "saving";

// O texto pode ser reprocessado: sem cache longo, o leitor sempre pega a versão nova.
const CONTENT_UPLOAD = { contentType: "text/plain; charset=utf-8", cacheControl: "0" };

/** Envios de ilustrações em paralelo (o Storage aceita bem; mais que isso trava o iPad). */
const IMAGE_UPLOAD_CONCURRENCY = 4;

type Bucket = ReturnType<ReturnType<typeof createClient>["storage"]["from"]>;

/** Tentativas por arquivo e espera (ms) entre elas, para quedas curtas de rede. */
const UPLOAD_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1200;

interface StorageFailure {
  message: string;
  statusCode?: string | number;
  status?: number;
}

/** Erro de rede (nunca chegou ao servidor) ou do servidor: vale tentar de novo. */
function isTransient(error: StorageFailure): boolean {
  const code = Number(error.statusCode ?? error.status);
  if (code >= 500) return true;
  if (code >= 400) return false;
  return /failed to fetch|networkerror|load failed|network request failed|timeout|abort/i.test(error.message);
}

/** Traduz o erro do Storage para uma frase que a pessoa entende. */
export function friendlyUploadError(error: StorageFailure): string {
  const code = Number(error.statusCode ?? error.status);
  const msg = error.message;
  if (isTransient(error) && !(code >= 500)) {
    return "A conexão com a internet falhou durante o envio. Confira o Wi-Fi ou os dados e tente de novo.";
  }
  if (code === 413 || /exceeded the maximum|too large/i.test(msg)) {
    return "O arquivo é grande demais para o envio. Reduza o PDF e tente de novo.";
  }
  if (code === 415 || /mime type|not supported/i.test(msg)) {
    return "Esse formato de arquivo não é aceito. Envie um PDF.";
  }
  if (code === 401 || code === 403 || /row-level security|jwt|not authorized|unauthorized/i.test(msg)) {
    return "Sua sessão expirou. Saia, entre de novo e tente outra vez.";
  }
  if (code >= 500) return "O servidor está instável agora. Aguarde um instante e tente de novo.";
  return `Falha no upload: ${msg}`;
}

/** Envia um arquivo, repetindo se a rede ou o servidor falharem de passagem. */
async function uploadWithRetry(
  bucket: Bucket,
  path: string,
  body: Parameters<Bucket["upload"]>[1],
  options: Parameters<Bucket["upload"]>[2],
) {
  let result = await bucket.upload(path, body, { ...options, upsert: true });
  for (let attempt = 1; attempt < UPLOAD_ATTEMPTS && result.error && isTransient(result.error); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    result = await bucket.upload(path, body, { ...options, upsert: true });
  }
  return result;
}

/**
 * Envia o arquivo original. Se passar do tamanho de uma parte, corta em pedaços e
 * envia um a um (`original.pdf.part001`…); `sent` recebe cada caminho enviado, para
 * quem chama poder desfazer tudo se algo falhar.
 */
export async function uploadOriginal(
  bucket: Bucket,
  path: string,
  file: File,
  contentType: string,
  sent: string[],
) {
  if (file.size <= PART_BYTES) {
    sent.push(path);
    return uploadWithRetry(bucket, path, file, { contentType });
  }
  const parts = splitInParts(file);
  for (let i = 0; i < parts.length; i++) {
    const target = partPath(path, i);
    sent.push(target);
    const result = await uploadWithRetry(bucket, target, parts[i], { contentType });
    if (result.error) return result;
  }
  return { data: { path }, error: null };
}

/** Envia as ilustrações para `folder`, em lotes. Devolve os caminhos enviados. */
async function uploadImages(bucket: Bucket, folder: string, images: ExtractedImage[]) {
  const paths: string[] = [];
  for (let i = 0; i < images.length; i += IMAGE_UPLOAD_CONCURRENCY) {
    const batch = images.slice(i, i + IMAGE_UPLOAD_CONCURRENCY);
    const results = await Promise.all(
      batch.map(({ name, blob }) =>
        uploadWithRetry(bucket, `${folder}/${name}`, blob, { contentType: blob.type }),
      ),
    );
    paths.push(...batch.map(({ name }) => `${folder}/${name}`));
    const failed = results.find((r) => r.error);
    if (failed?.error) throw Object.assign(new Error(failed.error.message), { paths });
  }
  return paths;
}

/** Caminhos de todos os arquivos de uma pasta do bucket (sem subpastas). */
export async function listFolder(bucket: Bucket, folder: string): Promise<string[]> {
  const { data } = await bucket.list(folder, { limit: 1000 });
  return (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
}

export interface UploadBookInput {
  file: File;
  title?: string;
  author?: string;
  cover?: File | null;
  /** Slugs de src/lib/books/categories.ts (até 3). */
  categories?: string[];
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

  // Copia o arquivo para a memória: arquivos do Google Drive não podem ser lidos duas vezes.
  const file = await snapshotFile(input.file);

  // Avisa já, em português, em vez de gastar a leitura do PDF e ser recusado no envio.
  if (file.size > MAX_FILE_BYTES) {
    const mb = Math.round(file.size / 1024 / 1024);
    throw new Error(
      `Este arquivo tem ${mb} MB e o limite é ${MAX_FILE_BYTES / 1024 / 1024} MB. Reduza o PDF e tente de novo.`,
    );
  }

  // 1. Extração local: falha rápido, antes de gastar upload.
  onStage?.("extracting");
  const extracted = await extractPdfText(file, onExtractProgress);
  const cover = input.cover ?? (await renderCover(file));

  // 2. Storage. O id é gerado aqui para montar os caminhos antes do insert.
  onStage?.("uploading");
  const bookId = crypto.randomUUID();
  const paths = bookStoragePaths(auth.user.id, bookId);
  const bucket = supabase.storage.from(BOOKS_BUCKET);

  const originalSent: string[] = [];
  const uploads = [
    uploadOriginal(bucket, paths.pdf, file, "application/pdf", originalSent),
    extracted.hasTextLayer
      ? uploadWithRetry(bucket, paths.content, new Blob([extracted.text], { type: "text/plain" }), CONTENT_UPLOAD)
      : null,
    cover ? uploadWithRetry(bucket, paths.cover, cover, { contentType: cover.type || "image/webp" }) : null,
  ];
  const results = await Promise.all(uploads);
  const failed = results.find((r) => r?.error);
  let imagePaths: string[] = [];
  let imageError: string | null = null;
  if (!failed) {
    try {
      imagePaths = await uploadImages(bucket, paths.images, extracted.images);
    } catch (err) {
      imagePaths = (err as { paths?: string[] }).paths ?? [];
      imageError = err instanceof Error ? err.message : "erro";
    }
  }
  const uploadError = failed?.error ?? (imageError ? { message: imageError } : null);
  if (uploadError) {
    await bucket.remove([...originalSent, paths.cover, paths.content, ...imagePaths]);
    throw new Error(friendlyUploadError(uploadError));
  }

  const categories = normalizeCategories(input.categories ?? []);
  // 3. Linha no banco só depois dos arquivos: a galeria nunca vê livro pela metade.
  onStage?.("saving");
  const { data: book, error } = await supabase
    .from("books")
    .insert({
      id: bookId,
      title: input.title?.trim() || extracted.title || file.name.replace(/\.pdf$/i, ""),
      author: input.author?.trim() || extracted.author,
      pdf_path: paths.pdf,
      cover_path: cover ? paths.cover : null,
      content_path: extracted.hasTextLayer ? paths.content : null,
      // Nem o OCR achou texto legível → 'failed'.
      processing_status: extracted.hasTextLayer ? "ready" : "failed",
      page_count: extracted.pageCount,
      word_count: extracted.wordCount,
      // Só envia a coluna quando há escolha: sem categorias, o envio funciona antes da migration.
      ...(categories.length > 0 && { categories }),
    })
    .select()
    .single();

  if (error) {
    await bucket.remove([...originalSent, paths.cover, paths.content, ...imagePaths]);
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
  const pdf = await downloadOriginal(bucket, book.pdf_path);
  if (!pdf) throw new Error("Não foi possível baixar o PDF original.");

  const extracted = await extractPdfText(pdf, onExtractProgress);
  const paths = bookStoragePaths(auth.user.id, book.id);

  // As ilustrações antigas saem antes: os nomes mudam se a extração mudar.
  const oldImages = await listFolder(bucket, paths.images);
  if (oldImages.length) await bucket.remove(oldImages);
  try {
    await uploadImages(bucket, paths.images, extracted.images);
  } catch (err) {
    throw new Error(`Falha ao salvar as ilustrações: ${err instanceof Error ? err.message : "erro"}`);
  }

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
