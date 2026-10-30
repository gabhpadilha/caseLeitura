// Só roda no browser (usa canvas). Ilustrações: onde estão na página e o recorte delas.
import type { PDFPageProxy } from "pdfjs-dist";

/** Retângulo em coordenadas do viewport na escala 1 (origem no topo esquerdo). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageImage {
  box: Box;
  /** Topo da imagem no espaço do PDF (y cresce para cima), como `RawLine.y`. */
  top: number;
}

export interface Illustration {
  /** WebP ou JPEG (ver `encodeImage`). */
  blob: Blob;
  width: number;
  height: number;
  top: number;
}

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** Ilustração menor que isso (fração da página) é ornamento, logo ou fio. */
const MIN_AREA = 0.02;
const MIN_SIDE = 0.08;
/** Imagem que cobre quase a página toda é fundo ou página escaneada, não ilustração. */
export const FULL_PAGE_AREA = 0.7;
/** Largura máxima do recorte salvo (px). */
const MAX_WIDTH = 1400;
/** Limite do canvas: o Safari do iPad recusa canvas muito grandes. */
const MAX_CANVAS_SIDE = 4096;

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function overlaps(a: Box, b: Box, margin: number): boolean {
  return (
    a.x - margin < b.x + b.w &&
    b.x - margin < a.x + a.w &&
    a.y - margin < b.y + b.h &&
    b.y - margin < a.y + a.h
  );
}

/** Junta imagens que se tocam: figuras às vezes vêm fatiadas em várias tiras. */
function mergeTouching(images: PageImage[], margin: number): PageImage[] {
  const merged = [...images];
  for (let changed = true; changed; ) {
    changed = false;
    outer: for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i].box;
        const b = merged[j].box;
        if (!overlaps(a, b, margin)) continue;
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        merged[i] = {
          box: { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y },
          top: Math.max(merged[i].top, merged[j].top),
        };
        merged.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }
  return merged;
}

/**
 * Onde cada imagem é desenhada na página. Percorre a lista de operações do
 * pdf.js acompanhando a matriz de transformação: uma imagem ocupa o quadrado
 * unitário levado pela matriz corrente.
 */
export async function findPageImages(
  page: PDFPageProxy,
  OPS: Record<string, number>,
): Promise<PageImage[]> {
  const { fnArray, argsArray } = await page.getOperatorList();
  const viewport = page.getViewport({ scale: 1 });
  const paints = new Set([
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintImageXObjectRepeat,
  ]);

  const stack: Matrix[] = [];
  let ctm: Matrix = IDENTITY;
  const images: PageImage[] = [];

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? IDENTITY;
    else if (fn === OPS.transform) ctm = multiply(ctm, args as Matrix);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      const matrix = args[0] as Matrix | null;
      if (matrix) ctm = multiply(ctm, matrix);
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? IDENTITY;
    else if (paints.has(fn)) {
      const corners = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].map(([u, v]) => [ctm[0] * u + ctm[2] * v + ctm[4], ctm[1] * u + ctm[3] * v + ctm[5]]);
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys),
      ]);
      // Recorta ao que aparece na página (imagens às vezes sangram para fora).
      const left = Math.max(0, Math.min(x1, x2));
      const right = Math.min(viewport.width, Math.max(x1, x2));
      const topPx = Math.max(0, Math.min(y1, y2));
      const bottom = Math.min(viewport.height, Math.max(y1, y2));
      if (right <= left || bottom <= topPx) continue;
      images.push({
        box: { x: left, y: topPx, w: right - left, h: bottom - topPx },
        top: Math.max(...ys),
      });
    }
  }

  return mergeTouching(images, Math.min(viewport.width, viewport.height) * 0.01);
}

/** Fração da página coberta pela maior imagem. */
export function largestImageArea(page: PDFPageProxy, images: PageImage[]): number {
  const { width, height } = page.getViewport({ scale: 1 });
  return Math.max(0, ...images.map(({ box }) => (box.w * box.h) / (width * height)));
}

/** Imagens com cara de ilustração: nem ornamento, nem fundo da página inteira. */
export function illustrationCandidates(
  page: PDFPageProxy,
  images: PageImage[],
  { allowFullPage = false } = {},
): PageImage[] {
  const { width, height } = page.getViewport({ scale: 1 });
  return images.filter(({ box }) => {
    const area = (box.w * box.h) / (width * height);
    if (area < MIN_AREA || box.w < width * MIN_SIDE || box.h < height * MIN_SIDE) return false;
    return allowFullPage || area < FULL_PAGE_AREA;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** WebP quando o navegador sabe gerar; o Safari devolve PNG (enorme), então cai para JPEG. */
export async function encodeImage(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const webp = await toBlob(canvas, "image/webp", 0.82);
  if (webp?.type === "image/webp") return webp;
  return toBlob(canvas, "image/jpeg", 0.85);
}

/** Renderiza a página uma vez e recorta cada ilustração em WebP. */
export async function cropIllustrations(
  page: PDFPageProxy,
  images: PageImage[],
): Promise<Illustration[]> {
  if (images.length === 0) return [];
  const base = page.getViewport({ scale: 1 });
  const widest = Math.max(...images.map((i) => i.box.w));
  const scale = Math.min(
    MAX_WIDTH / widest,
    MAX_CANVAS_SIDE / base.width,
    MAX_CANVAS_SIDE / base.height,
    4,
  );
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, viewport }).promise;

  const out: Illustration[] = [];
  for (const { box, top } of images) {
    const crop = document.createElement("canvas");
    crop.width = Math.max(1, Math.round(box.w * scale));
    crop.height = Math.max(1, Math.round(box.h * scale));
    crop
      .getContext("2d")
      ?.drawImage(canvas, box.x * scale, box.y * scale, crop.width, crop.height, 0, 0, crop.width, crop.height);
    const blob = await encodeImage(crop);
    if (blob) out.push({ blob, width: crop.width, height: crop.height, top });
  }
  // Libera a memória do canvas grande já (o Safari demora a coletar).
  canvas.width = canvas.height = 0;
  return out;
}
