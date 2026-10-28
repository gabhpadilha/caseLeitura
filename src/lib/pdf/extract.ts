// Só roda no browser (usa worker e canvas). Importe apenas de Client Components.
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";
import { cleanExtractedText, countWords, normalizeChars, stripRunningHeaders } from "./clean-text";
import { markStructure, visualEdges, type RawLine } from "./structure";

export interface ExtractProgress {
  page: number;
  totalPages: number;
}

export interface ExtractResult {
  text: string;
  pageCount: number;
  wordCount: number;
  /** PDF escaneado (só imagem): não há camada de texto para extrair. */
  hasTextLayer: boolean;
  title: string | null;
  author: string | null;
}

/** Espaçamento vertical (em alturas de linha) a partir do qual há um parágrafo. */
const PARAGRAPH_GAP = 1.6;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

/** Import dinâmico: o pdf.js depende de APIs do browser e não pode entrar no SSR. */
function loadPdfjs() {
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

export async function extractPdfText(
  file: Blob,
  onProgress?: (p: ExtractProgress) => void,
): Promise<ExtractResult> {
  const pdfjs = await loadPdfjs();
  // getDocument transfere (detacha) o buffer, então usamos uma cópia própria.
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  try {
    const pages: RawLine[][] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      pages.push(await pageToLines(page));
      page.cleanup();
      onProgress?.({ page: n, totalPages: doc.numPages });
    }

    // Cabeçalhos/rodapés saem pela posição visual (a ordem interna do PDF pode
    // pôr o cabeçalho depois do corpo). O tamanho do corpo do texto, usado para
    // achar os títulos, só é conhecido depois de ler o livro inteiro.
    const body = stripRunningHeaders(pages, (l) => normalizeChars(l.text), visualEdges);
    const text = cleanExtractedText(markStructure(body), { stripHeaders: false });
    const wordCount = countWords(text);

    return {
      text,
      pageCount: doc.numPages,
      wordCount,
      // Menos de ~5 palavras por página ≈ PDF escaneado (precisaria de OCR).
      hasTextLayer: wordCount >= doc.numPages * 5,
      ...(await readMetadata(doc)),
    };
  } finally {
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
