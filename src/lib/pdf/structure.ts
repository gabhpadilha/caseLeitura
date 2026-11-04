/**
 * Estrutura do texto a partir da tipografia do PDF.
 *
 * O extrator entrega cada linha com o tamanho de fonte dela. Aqui descobrimos o
 * tamanho do corpo do texto (o mais usado no livro) e marcamos como título as
 * linhas visivelmente maiores, no formato `# Título` / `## Subtítulo` /
 * `### Seção`, que o leitor renderiza como cabeçalhos.
 */

export interface RawLine {
  text: string;
  /** Tamanho da fonte (o maior entre os fragmentos da linha). */
  size: number;
  /** Houve espaçamento vertical extra antes desta linha. */
  gapBefore: boolean;
  /** Posição vertical da linha na página (no PDF, y cresce para cima). */
  y: number;
  /** Começo e fim horizontais da linha, no espaço do PDF (só no texto do PDF, não no OCR). */
  x0?: number;
  x1?: number;
  /** Linha que é uma ilustração: `text` é o marcador `![LxA](arquivo)`. */
  image?: boolean;
}

/** Bordas pela posição visual: as `edge` linhas mais altas e as mais baixas. */
export function visualEdges(lines: RawLine[], edge = 2): number[] {
  const byY = lines.map((l, i) => ({ i, y: l.y })).sort((a, b) => b.y - a.y);
  return [...new Set([...byY.slice(0, edge), ...byY.slice(-edge)].map((l) => l.i))];
}

export type HeadingLevel = 0 | 1 | 2 | 3;

/** Prefixo de título no texto limpo (`# `, `## `, `### `). */
export const HEADING_MARK = /^(#{1,3}) /;

/**
 * Marcador de ilustração no texto limpo: `![1200x800](p12-1.webp)` (dimensões
 * em px), com a legenda opcional entre aspas: `![1200x800](p12-1.webp "Lênin em 1917")`.
 */
export const IMAGE_MARK = /^!\[(\d+)x(\d+)\]\(([^()\s"]+)(?: "([^"\n]*)")?\)$/;

export function imageMarker(file: string, width: number, height: number, caption?: string): string {
  // Aspas retas fechariam a legenda antes da hora: viram tipográficas.
  const text = caption?.replace(/"([^"]*)"/g, "“$1”").replace(/"/g, "”").replace(/\s+/g, " ").trim();
  return `![${width}x${height}](${file}${text ? ` "${text}"` : ""})`;
}

/** Tamanho de fonte mais frequente, ponderado pela quantidade de caracteres. */
export function bodyFontSize(pages: RawLine[][]): number {
  const weight = new Map<number, number>();
  for (const line of pages.flat()) {
    if (line.image) continue;
    const key = Math.round(line.size * 2) / 2;
    weight.set(key, (weight.get(key) ?? 0) + line.text.trim().length);
  }
  let best = 0;
  let bestWeight = -1;
  for (const [size, w] of weight) {
    if (w > bestWeight) [best, bestWeight] = [size, w];
  }
  return best;
}

/**
 * Nível de título pela proporção em relação ao corpo do texto. Ignora capitulares
 * (uma letra gigante), números soltos e linhas longas demais para serem títulos.
 */
export function headingLevel(text: string, size: number, body: number): HeadingLevel {
  const t = text.trim();
  if (body <= 0 || t.length < 2 || t.length > 120 || !/\p{L}{2}/u.test(t)) return 0;
  const ratio = size / body;
  if (ratio >= 1.7) return 1;
  if (ratio >= 1.35) return 2;
  // 1.12: o corpo é arredondado para 0,5 pt (14,4 vira 14,5), e títulos de
  // capítulo 15% maiores (16,6 pt) ficavam logo abaixo de 1.15.
  if (ratio >= 1.12) return 3;
  return 0;
}

/**
 * Converte as linhas em texto para o pipeline de limpeza: "" marca espaçamento
 * extra e títulos ganham o prefixo `#`.
 */
export function markStructure(pages: RawLine[][]): string[][] {
  const body = bodyFontSize(pages);
  return pages.map((lines) =>
    lines.flatMap((line) => {
      if (line.image) return ["", line.text];
      const level = headingLevel(line.text, line.size, body);
      const text = level ? `${"#".repeat(level)} ${line.text.trim()}` : line.text;
      return line.gapBefore ? ["", text] : [text];
    }),
  );
}
