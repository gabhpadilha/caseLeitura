/**
 * Ilustrações e o texto em volta delas.
 *
 * O pdf.js entrega como texto comum tanto a legenda ("Lênin discursa em
 * Petrogrado, 1917") quanto os rótulos desenhados dentro de mapas e gráficos.
 * Sem tratamento, a legenda vira um parágrafo solto (às vezes no meio de outro)
 * e os rótulos aparecem duplicados, fora da figura. Aqui:
 *   - o texto dentro da área da imagem sai (já está no recorte);
 *   - a legenda (fonte menor ou "Figura 3…" logo abaixo ou acima) vai junto da
 *     ilustração, no marcador `![LxA](arquivo "legenda")`.
 */
import { joinLines, normalizeChars } from "./clean-text";
import type { PdfRect } from "./images";
import type { RawLine } from "./structure";

/** Legenda costuma vir em corpo menor que o texto. */
const CAPTION_SIZE_RATIO = 0.93;
/** Distância máxima (em alturas de linha) entre a figura e a 1ª linha da legenda. */
const CAPTION_MAX_GAP = 2.6;
const CAPTION_MAX_LINES = 5;
const CAPTION_KEYWORD = /^(?:fig(?:ura)?\.?\s*\d|foto(?:grafia)?\b|imagem\b|ilustra[çc][ãa]o\b|mapa\b|gr[áa]fico\b|tabela\b|quadro\b|fonte\s*:)/iu;

function lineHeight(line: RawLine, body: number) {
  return line.size || body || 10;
}

/** A linha está desenhada sobre a imagem (rótulo de mapa, texto na foto). */
function insideFigure(line: RawLine, fig: PdfRect, body: number): boolean {
  const pad = lineHeight(line, body) * 0.25;
  if (line.y < fig.bottom - pad || line.y > fig.top + pad) return false;
  // Sem posição horizontal (OCR), basta a vertical.
  if (line.x0 === undefined || line.x1 === undefined) return true;
  const overlap = Math.min(line.x1, fig.right) - Math.max(line.x0, fig.left);
  return overlap > (line.x1 - line.x0) * 0.5;
}

function withinWidth(line: RawLine, fig: PdfRect): boolean {
  if (line.x0 === undefined || line.x1 === undefined) return true;
  const slack = (fig.right - fig.left) * 0.15;
  return line.x0 >= fig.left - slack && line.x1 <= fig.right + slack;
}

/** Linhas que formam a legenda a partir de `start`, andando para longe da figura. */
function captionRun(ordered: RawLine[], fig: PdfRect, body: number, edge: number): RawLine[] {
  const first = ordered[0];
  if (!first || first.image) return [];
  const height = lineHeight(first, body);
  if (Math.abs(edge - first.y) > height * CAPTION_MAX_GAP) return [];
  const small = body > 0 && first.size <= body * CAPTION_SIZE_RATIO;
  if (!(small || CAPTION_KEYWORD.test(first.text.trim())) || !withinWidth(first, fig)) return [];

  const run = [first];
  for (const line of ordered.slice(1, CAPTION_MAX_LINES)) {
    const prev = run[run.length - 1];
    const sameSize = Math.abs(line.size - first.size) <= Math.max(0.6, first.size * 0.06);
    const close = Math.abs(prev.y - line.y) <= lineHeight(prev, body) * 1.8;
    if (line.image || !sameSize || !close || line.gapBefore || !withinWidth(line, fig)) break;
    // Legenda com a fonte do corpo só continua se a linha anterior não fechou a frase.
    if (!small && /[.!?…]["”»’)\]]*$/u.test(prev.text.trim())) break;
    run.push(line);
  }
  return run;
}

export interface FigureText {
  /** As linhas da página sem o texto da figura e sem a legenda. */
  lines: RawLine[];
  caption: string | null;
}

/** Separa a legenda e o texto interno de uma ilustração das linhas da página. */
export function separateFigureText(lines: RawLine[], fig: PdfRect, body: number): FigureText {
  const rest = lines.filter((l) => l.image || !insideFigure(l, fig, body));
  const below = rest.filter((l) => !l.image && l.y < fig.bottom).sort((a, b) => b.y - a.y);
  const above = rest.filter((l) => !l.image && l.y > fig.top).sort((a, b) => a.y - b.y);

  let run = captionRun(below, fig, body, fig.bottom);
  if (run.length === 0) run = captionRun(above, fig, body, fig.top).reverse();
  if (run.length === 0) return { lines: rest, caption: null };

  const taken = new Set(run);
  const caption = joinLines(run.map((l) => normalizeChars(l.text)).join("\n"));
  return { lines: rest.filter((l) => !taken.has(l)), caption: caption || null };
}
