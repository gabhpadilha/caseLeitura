// Envio de quadrinho no browser: as páginas viram imagens (sem extrair texto).
// PDF → cada página renderizada em WebP/JPEG; CBZ → as imagens do zip, sem recompressão.
import { strFromU8, unzip, type Unzipped } from "fflate";
import { createClient } from "@/lib/supabase/client";
import { loadPdfjs, renderCover } from "@/lib/pdf/extract";
import { encodeImage } from "@/lib/pdf/images";
import { BOOKS_BUCKET, bookStoragePaths, type Book } from "@/types/book";

export type ComicStage = "pages" | "saving";

export interface ComicProgress {
  page: number;
  totalPages: number;
}

export interface UploadComicInput {
  file: File;
  title?: string;
  author?: string;
}

export interface ComicCallbacks {
  onStage?: (stage: ComicStage) => void;
  onProgress?: (p: ComicProgress) => void;
}

/** Largura das páginas renderizadas de PDF: nítida no iPad com zoom, sem pesar. */
const PAGE_WIDTH = 1600;
const MAX_CANVAS_SIDE = 4096;
const COVER_WIDTH = 480;
/** Páginas enviadas em paralelo. */
const UPLOAD_BATCH = 4;

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** Coluna inexistente: o banco ainda não recebeu a migration dos quadrinhos. */
const UNDEFINED_COLUMN = "42703";

interface Page {
  blob: Blob;
  ext: string;
}

export function isCbz(file: File): boolean {
  return /\.cbz$/i.test(file.name) || /zip|comicbook/.test(file.type);
}

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) =>
    unzip(data, (err, files) => (err ? reject(err) : resolve(files))),
  );
}

/** Metadados do ComicInfo.xml (padrão dos CBZ), quando houver. */
function readComicInfo(xml: string | null) {
  const tag = (name: string) =>
    xml?.match(new RegExp(`<${name}>([^<]+)</${name}>`, "i"))?.[1].trim() || null;
  const series = tag("Series");
  const number = tag("Number");
  const title = tag("Title") ?? (series ? `${series}${number ? ` #${number}` : ""}` : null);
  return { title, author: tag("Writer") };
}

/** Imagens do CBZ na ordem dos nomes (ordem natural: 2 antes de 10). */
async function cbzPages(file: File) {
  const files = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
  const names = Object.keys(files)
    .filter((name) => {
      const base = name.split("/").pop() ?? "";
      return IMAGE_TYPES[extOf(name)] && !name.startsWith("__MACOSX/") && !base.startsWith(".");
    })
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const infoName = Object.keys(files).find((n) => /(^|\/)comicinfo\.xml$/i.test(n));

  return {
    count: names.length,
    meta: readComicInfo(infoName ? strFromU8(files[infoName]) : null),
    async *pages(): AsyncGenerator<Page> {
      for (const name of names) {
        const ext = extOf(name) === "jpeg" ? "jpg" : extOf(name);
        yield { blob: new Blob([files[name] as BlobPart], { type: IMAGE_TYPES[ext] }), ext };
      }
    },
  };
}

/** Título do PDF que é lixo de ferramenta (navegador, editor, nome de arquivo). */
function usefulTitle(title: string | null): string | null {
  if (!title || /^(about:|https?:|untitled|sem t[ií]tulo)|\.(pdf|docx?|indd|psd|cbz)$/i.test(title)) return null;
  return title;
}

/** Páginas do PDF renderizadas uma a uma (só uma página na memória por vez). */
async function pdfPages(file: File) {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let title: string | null = null;
  let author: string | null = null;
  try {
    const { info } = await doc.getMetadata();
    const meta = info as Record<string, unknown>;
    if (typeof meta.Title === "string" && meta.Title.trim()) title = meta.Title.trim();
    if (typeof meta.Author === "string" && meta.Author.trim()) author = meta.Author.trim();
  } catch {
    // Sem metadados: usa o nome do arquivo.
  }

  return {
    count: doc.numPages,
    meta: { title: usefulTitle(title), author },
    async *pages(): AsyncGenerator<Page> {
      try {
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(PAGE_WIDTH / base.width, MAX_CANVAS_SIDE / base.height);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await page.render({ canvas, viewport }).promise;
          const blob = await encodeImage(canvas);
          canvas.width = canvas.height = 0;
          page.cleanup();
          if (!blob) throw new Error(`Não foi possível gerar a página ${n}.`);
          yield { blob, ext: blob.type === "image/jpeg" ? "jpg" : "webp" };
        }
      } finally {
        await doc.destroy();
      }
    },
  };
}

/** Páginas e metadados do arquivo do quadrinho (CBZ ou PDF). */
export function readComicSource(file: File) {
  return isCbz(file) ? cbzPages(file) : pdfPages(file);
}

/** Capa pequena para a banca, a partir da primeira página. */
export async function coverFrom(page: Blob): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(page);
    const canvas = document.createElement("canvas");
    canvas.width = COVER_WIDTH;
    canvas.height = Math.round((bitmap.height / bitmap.width) * COVER_WIDTH);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await encodeImage(canvas);
  } catch {
    return null;
  }
}

export async function uploadComic(
  input: UploadComicInput,
  { onStage, onProgress }: ComicCallbacks = {},
): Promise<Book> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Faça login para enviar quadrinhos.");

  const cbz = isCbz(input.file);
  const source = await readComicSource(input.file);
  if (source.count === 0) throw new Error("Não encontramos páginas nesse arquivo.");

  const bookId = crypto.randomUUID();
  const paths = bookStoragePaths(auth.user.id, bookId);
  const original = cbz ? paths.pdf.replace(/\.pdf$/, ".cbz") : paths.pdf;
  const bucket = supabase.storage.from(BOOKS_BUCKET);
  const uploaded: string[] = [];

  const upload = async (path: string, blob: Blob, contentType: string) => {
    const { error } = await bucket.upload(path, blob, { contentType, upsert: true });
    if (error) throw new Error(`Falha no upload: ${error.message}`);
    uploaded.push(path);
  };

  try {
    // 1. Páginas: geradas e enviadas em lotes, para não juntar o gibi todo na memória.
    onStage?.("pages");
    let cover: Blob | null = null;
    let batch: Promise<void>[] = [];
    let n = 0;
    for await (const page of source.pages()) {
      n++;
      if (n === 1 && cbz) cover = await coverFrom(page.blob);
      const name = `${String(n).padStart(4, "0")}.${page.ext}`;
      batch.push(upload(`${paths.pages}/${name}`, page.blob, page.blob.type));
      if (batch.length >= UPLOAD_BATCH) {
        await Promise.all(batch);
        batch = [];
      }
      onProgress?.({ page: n, totalPages: source.count });
    }
    await Promise.all(batch);

    // 2. Original e capa.
    onStage?.("saving");
    cover ??= await renderCover(input.file, COVER_WIDTH);
    await Promise.all([
      upload(original, input.file, cbz ? "application/zip" : "application/pdf"),
      cover ? upload(paths.cover, cover, cover.type || "image/webp") : null,
    ]);

    // 3. Linha no banco por último: a banca nunca mostra gibi pela metade.
    const { data: book, error } = await supabase
      .from("books")
      .insert({
        id: bookId,
        kind: "comic",
        title:
          input.title?.trim() || source.meta.title || input.file.name.replace(/\.(pdf|cbz)$/i, ""),
        author: input.author?.trim() || source.meta.author,
        pdf_path: original,
        cover_path: cover ? paths.cover : null,
        content_path: null,
        processing_status: "ready",
        page_count: n,
      })
      .select()
      .single();
    if (error) {
      throw new Error(
        error.code === UNDEFINED_COLUMN
          ? "O banco ainda não aceita quadrinhos: rode o SQL dos quadrinhos no Supabase."
          : `Falha ao salvar o quadrinho: ${error.message}`,
      );
    }
    return book;
  } catch (err) {
    if (uploaded.length) await bucket.remove(uploaded);
    throw err;
  }
}
