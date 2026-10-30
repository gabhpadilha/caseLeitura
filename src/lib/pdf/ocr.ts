// Só roda no browser. OCR de páginas escaneadas com Tesseract (WebAssembly, no próprio aparelho).
import type { PDFPageProxy } from "pdfjs-dist";
import type { Worker } from "tesseract.js";
import type { RawLine } from "./structure";

/** Largura da imagem enviada ao OCR: ~300 dpi numa página A5, sem estourar a memória do iPad. */
const OCR_WIDTH = 2000;
/** Linhas com confiança menor que isso costumam ser manchas, ilustrações ou bordas. */
const MIN_CONFIDENCE = 45;
/** Salto entre linhas (em alturas de linha) a partir do qual há um parágrafo. */
const PARAGRAPH_GAP = 1.9;

export interface OcrPage {
  lines: RawLine[];
  words: number;
}

/**
 * Um worker por extração. O modelo de português (~4 MB) vem do CDN na primeira
 * vez e fica no cache do navegador (IndexedDB) para os próximos livros.
 */
export async function createOcr(): Promise<{
  recognize: (page: PDFPageProxy) => Promise<OcrPage>;
  terminate: () => Promise<void>;
}> {
  const { createWorker } = await import("tesseract.js");
  const worker: Worker = await createWorker("por");

  return {
    recognize: (page) => recognizePage(worker, page),
    terminate: async () => {
      await worker.terminate();
    },
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Renderiza a página, reconhece o texto e devolve as linhas no mesmo formato
 * do extrator de PDFs com texto (`RawLine`), em unidades do PDF: daí em diante
 * cabeçalhos, títulos e parágrafos passam pelo mesmo pipeline.
 */
async function recognizePage(worker: Worker, page: PDFPageProxy): Promise<OcrPage> {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(OCR_WIDTH / base.width, 4096 / base.height);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, viewport }).promise;

  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  canvas.width = canvas.height = 0;

  const found = (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines
        .filter((line) => line.confidence >= MIN_CONFIDENCE && /\p{L}/u.test(line.text))
        .map((line, i) => ({
          text: line.text.replace(/\s+/g, " ").trim(),
          // Altura da linha sem ascendentes/descendentes: estável para o mesmo corpo de fonte.
          height: (line.rowAttributes?.rowHeight || line.bbox.y1 - line.bbox.y0) / scale,
          top: line.bbox.y0 / scale,
          firstOfParagraph: i === 0,
        })),
    ),
  );

  const lineHeight = median(found.map((l) => l.height)) || 12;
  const lines: RawLine[] = [];
  let prevTop: number | null = null;
  let prevText = "";

  for (const line of found) {
    if (!line.text) continue;
    const gap = prevTop === null ? 0 : (line.top - prevTop) / lineHeight;
    // O Tesseract separa parágrafos pelo recuo; só confia nisso quando a frase anterior terminou.
    const paragraphStart = line.firstOfParagraph && /[.!?…:]["”»’)\]]*$/u.test(prevText);
    lines.push({
      text: line.text,
      size: Math.round(line.height * 2) / 2,
      gapBefore: gap > PARAGRAPH_GAP || paragraphStart,
      // No PDF, y cresce para cima.
      y: base.height - line.top,
    });
    prevTop = line.top;
    prevText = line.text;
  }

  const words = lines.reduce((n, l) => n + (l.text.match(/\p{L}{2,}/gu)?.length ?? 0), 0);
  return { lines, words };
}
