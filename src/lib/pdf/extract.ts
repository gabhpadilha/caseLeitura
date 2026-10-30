// Só roda no browser (usa worker e canvas). Importe apenas de Client Components.
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";
import { cleanExtractedText, countWords, normalizeChars, stripRunningHeaders } from "./clean-text";
import {
  cropIllustrations,
  findPageImages,
  illustrationCandidates,
  largestImageArea,
  type Illustration,
} from "./images";
import { createOcr } from "./ocr";
import { imageMarker, markStructure, visualEdges, type RawLine } from "./structure";

export interface ExtractProgress {
  page: number;
  totalPages: number;
  /** "ocr" = reconhecendo o texto de uma página escaneada; "ocr-setup" = baixando o modelo. */
  phase: "text" | "ocr-setup" | "ocr";
}

/** Texto curto do progresso para a interface ("página 3 de 40", "OCR da página 3 de 40"). */
export function progressLabel({ page, totalPages, phase }: ExtractProgress): string {
  if (phase === "ocr-setup") return "preparando o reconhecimento de texto (só na primeira vez)";
  if (phase === "ocr") return `reconhecendo o texto da página ${page} de ${totalPages} (escaneada)`;
  return `página ${page} de ${totalPages}`;
}

export interface ExtractedImage {
  /** Nome do arquivo, referenciado no texto por `![LxA](nome)`. */
  name: string;
  blob: Blob;
}

export interface ExtractResult {
  text: string;
  pageCount: number;
  wordCount: number;
  /** Saiu texto do PDF (direto ou por OCR). */
  hasTextLayer: boolean;
  /** Páginas lidas por OCR (escaneadas). */
  ocrPages: number;
  images: ExtractedImage[];
  title: string | null;
  author: string | null;
}

/** Espaçamento vertical (em alturas de linha) a partir do qual há um parágrafo. */
const PARAGRAPH_GAP = 1.6;

/** Página com menos letras que isso e uma imagem grande é escaneada: vai para o OCR. */
const SCANNED_MAX_CHARS = 20;
const SCANNED_MIN_IMAGE_AREA = 0.5;
/** OCR que acha menos palavras que isso numa página: era uma ilustração de página inteira. */
const OCR_MIN_WORDS = 12;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

/** Import dinâmico: o pdf.js depende de APIs do browser e não pode entrar no SSR. */
export function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return "str" in item;
}

/**
 * Reconstrói as linhas de uma página a partir dos fragmentos posicionados do
 * pdf.js, guardando o tamanho da fonte de cada linha e se houve um salto
 * vertical antes dela (provável parágrafo).
 */
async function pageToLines(page: PDFPageProxy): Promise<RawLine[]> {
  const { items } = await page.getTextContent();
  const lines: RawLine[] = [];

  let current = "";
  let currentSize = 0;
  let gapBefore = false;
  let lineY: number | null = null;
  let lineHeight = 0;
  let prevEndX: number | null = null;

  const flush = () => {
    if (current.trim()) {
      lines.push({ text: current, size: currentSize, gapBefore, y: lineY ?? 0 });
      gapBefore = false;
    }
    current = "";
    currentSize = 0;
    prevEndX = null;
  };

  for (const item of items) {
    if (!isTextItem(item) || item.dir === "ttb") continue;

    const [, , , scaleY, x, y] = item.transform as number[];
    const height = item.height || Math.abs(scaleY) || lineHeight || 10;

    if (lineY !== null && Math.abs(y - lineY) > height * 0.5) {
      // Nova linha: o PDF desenha de cima para baixo (y decresce).
      const gap = (lineY - y) / (lineHeight || height);
      flush();
      if (gap > PARAGRAPH_GAP) gapBefore = true;
    }

    if (item.str) {
      // Fragmentos na mesma linha às vezes vêm sem o espaço entre eles.
      const needsSpace =
        prevEndX !== null &&
        x - prevEndX > height * 0.15 &&
        !current.endsWith(" ") &&
        !item.str.startsWith(" ");
      current += (needsSpace ? " " : "") + item.str;
      if (item.str.trim()) currentSize = Math.max(currentSize, height);
      prevEndX = x + item.width;
      lineY = y;
      lineHeight = height;
    }

    if (item.hasEOL) flush();
  }
  flush();

  return lines;
}

async function readMetadata(doc: PDFDocumentProxy) {
  try {
    const { info } = await doc.getMetadata();
    const meta = info as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    return { title: str(meta.Title), author: str(meta.Author) };
  } catch {
    return { title: null, author: null };
  }
}

/** Põe a ilustração entre as linhas da página, pela altura em que aparece. */
function insertByPosition(lines: RawLine[], image: RawLine): RawLine[] {
  const at = lines.findIndex((l) => !l.image && l.y < image.y);
  return at === -1 ? [...lines, image] : [...lines.slice(0, at), image, ...lines.slice(at)];
}

type Ocr = Awaited<ReturnType<typeof createOcr>>;

export async function extractPdfText(
  file: Blob,
  onProgress?: (p: ExtractProgress) => void,
): Promise<ExtractResult> {
  const pdfjs = await loadPdfjs();
  // getDocument transfere (detacha) o buffer, então usamos uma cópia própria.
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const OPS = pdfjs.OPS as unknown as Record<string, number>;

  // O Tesseract só é baixado se aparecer alguma página escaneada.
  let ocr: Ocr | null = null;
  let ocrPages = 0;

  try {
    const pages: RawLine[][] = [];
    const illustrations: Illustration[][] = [];

    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      let lines = await pageToLines(page);
      const images = await findPageImages(page, OPS);
      const chars = lines.reduce((sum, l) => sum + l.text.replace(/\s/g, "").length, 0);
      let pictures = illustrationCandidates(page, images);

      if (chars < SCANNED_MAX_CHARS && largestImageArea(page, images) >= SCANNED_MIN_IMAGE_AREA) {
        if (!ocr) {
          onProgress?.({ page: n, totalPages: doc.numPages, phase: "ocr-setup" });
          ocr = await createOcr();
        }
        onProgress?.({ page: n, totalPages: doc.numPages, phase: "ocr" });
        const result = await ocr.recognize(page);
        if (result.words >= OCR_MIN_WORDS) {
          lines = result.lines;
          pictures = []; // a imagem é a própria página
          ocrPages++;
        } else {
          // Quase sem texto: ilustração de página inteira (o OCR leu só ruído).
          pictures = illustrationCandidates(page, images, { allowFullPage: true });
          lines = [];
        }
      }

      pages.push(lines);
      illustrations.push(await cropIllustrations(page, pictures));
      page.cleanup();
      onProgress?.({ page: n, totalPages: doc.numPages, phase: "text" });
    }

    // Cabeçalhos/rodapés saem pela posição visual (a ordem interna do PDF pode
    // pôr o cabeçalho depois do corpo). As ilustrações entram depois, para não
    // serem confundidas com cabeçalhos. O tamanho do corpo do texto, usado para
    // achar os títulos, só é conhecido depois de ler o livro inteiro.
    const images: ExtractedImage[] = [];
    const body = stripRunningHeaders(pages, (l) => normalizeChars(l.text), visualEdges).map(
      (lines, p) =>
        illustrations[p].reduce((acc, picture, i) => {
          const ext = picture.blob.type === "image/jpeg" ? "jpg" : "webp";
          const name = `p${p + 1}-${i + 1}.${ext}`;
          images.push({ name, blob: picture.blob });
          const text = imageMarker(name, picture.width, picture.height);
          return insertByPosition(acc, { text, size: 0, gapBefore: true, y: picture.top, image: true });
        }, lines),
    );
    const text = cleanExtractedText(markStructure(body), { stripHeaders: false });
    // Os marcadores de ilustração (nomes de arquivo) não são palavras do livro.
    const wordCount = countWords(text.replace(/^!\[.*$/gm, ""));

    return {
      text,
      pageCount: doc.numPages,
      wordCount,
      // Menos de ~5 palavras por página ≈ nada legível, nem com OCR.
      hasTextLayer: wordCount >= doc.numPages * 5 || (images.length > 0 && wordCount > 0),
      ocrPages,
      images,
      ...(await readMetadata(doc)),
    };
  } finally {
    await ocr?.terminate();
    await doc.destroy();
  }
}

/** Renderiza a 1ª página como capa (WebP) quando o usuário não envia uma. */
export async function renderCover(file: Blob, width = 480): Promise<Blob | null> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
    .promise;

  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / base.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvas, viewport }).promise;
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  } catch {
    return null;
  } finally {
    await doc.destroy();
  }
}
