/**
 * Limpeza do texto extraído de PDFs.
 *
 * Entrada: páginas → linhas, como saem do extrator. Uma linha vazia ("")
 * representa um espaçamento vertical maior que o normal (provável parágrafo), e
 * linhas com prefixo `# `/`## `/`### ` são títulos (ver ./structure.ts).
 * Saída: texto corrido, um bloco por parágrafo ou título, separados por "\n\n".
 *
 * Pipeline:
 *   1. normalizeChars      — ligaduras, acentos soltos, glifos privados, espaços exóticos
 *   2. stripRunningHeaders — cabeçalhos/rodapés repetidos e números de página
 *   3. markParagraphs      — decide onde há quebra de parágrafo real
 *   4. joinLines (regex)   — junta linhas quebradas e desfaz hifenização
 */

import { HEADING_MARK, IMAGE_MARK } from "./structure";

const LIGATURES: Record<string, string> = {
  "ﬀ": "ff",
  "ﬁ": "fi",
  "ﬂ": "fl",
  "ﬃ": "ffi",
  "ﬄ": "ffl",
  "ﬅ": "st",
  "ﬆ": "st",
};

/** Fim de frase: . ! ? … : seguido opcionalmente de aspas/parênteses de fechamento. */
const SENTENCE_END = /[.!?…:]["”»’)\]]*$/u;

/** Travessão de diálogo no início da linha (padrão em livros pt-BR). */
const DIALOGUE_START = /^[—–]\s*\S/u;

/**
 * Linha que é só número de página: "12", "- 12 -", "Página 12", "p. 12",
 * "1/227", "1 de 227", "Página 3 de 40", "3 of 40".
 */
const PAGE_NUMBER =
  /^[-–—\s]*(?:p(?:á|a)g(?:ina)?\.?|p\.|page)?\s*\d{1,4}(?:\s*(?:\/|de|of)\s*\d{1,5})?[-–—\s]*$/iu;

/**
 * Acentos "soltos": muitos PDFs (LaTeX, fontes antigas, alguns InDesign)
 * desenham a letra e o acento como glifos separados, e o texto sai como
 * "Revoluc¸˜ao". Aqui o acento de espaçamento vira o combinante equivalente.
 * Só os caracteres de espaçamento próprios de acento (não ^ ~ ` do teclado).
 */
const SPACING_ACCENT: Record<string, string> = {
  "´": "\u0301",
  "ˆ": "\u0302",
  "˜": "\u0303",
  "¨": "\u0308",
  "¸": "\u0327",
  "˚": "\u030A",
  "ˋ": "\u0300",
};
const ACCENT = "[´ˆ˜¨˚ˋ]";
/** Letras que recebem acento em português (e o ñ dos nomes). */
const ACCENTABLE = "[aeiouAEIOUnN]";

/** Glifos privados com significado conhecido (ligaduras das fontes do Mac). */
const PRIVATE_USE: Record<string, string> = { "\uF001": "fi", "\uF002": "fl" };

/** O resultado é uma letra acentuada de verdade (um único caractere após o NFC). */
function compose(letter: string, accent: string): string | null {
  const composed = (letter + SPACING_ACCENT[accent]).normalize("NFC");
  return composed.length === 1 ? composed : null;
}

const ACCENTABLE_RE = new RegExp(`^${ACCENTABLE}$`);
const ACCENT_RE = new RegExp(`^${ACCENT}$`);

/**
 * Recompõe letras acentuadas que o PDF entregou em pedaços. O acento pode vir
 * antes da letra ("˜ao", a ordem em que costuma ser desenhado) ou depois
 * ("a˜o"). Entre duas letras acentuáveis, o til fica com o "ão/ãe/õe" e os
 * outros casos seguem a ordem mais comum na própria linha.
 */
export function repairAccents(input: string): string {
  // Cedilha: sempre depois do c ("c¸" → "ç"), às vezes com espaço.
  const s = input.replace(/([cC]) ?¸/g, (_, c: string) => compose(c, "¸")!);
  if (!/[´ˆ˜¨˚ˋ\u0300-\u036f]/.test(s)) return s;

  const chars = [...s];
  const isLetter = (i: number) => i >= 0 && i < chars.length && ACCENTABLE_RE.test(chars[i]);
  // Ordem dominante na linha, pelos casos sem ambiguidade.
  let before = 0;
  let after = 0;
  chars.forEach((ch, i) => {
    if (!ACCENT_RE.test(ch)) return;
    const next = isLetter(i + 1) || (chars[i + 1] === " " && isLetter(i + 2));
    const prev = isLetter(i - 1);
    if (next && !prev) before++;
    if (prev && !next) after++;
  });

  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (!ACCENT_RE.test(ch)) {
      out += ch;
      continue;
    }
    const prevLetter = isLetter(i - 1) ? chars[i - 1] : null;
    const nextIndex = isLetter(i + 1) ? i + 1 : chars[i + 1] === " " && isLetter(i + 2) ? i + 2 : -1;
    const nextLetter = nextIndex >= 0 ? chars[nextIndex] : null;

    let withPrev = prevLetter !== null && (nextLetter === null || after > before);
    if (prevLetter && nextLetter && ch === "˜") {
      withPrev = /^[aA][oOeE]$|^[oO][eE]$/.test(prevLetter + nextLetter);
    }
    if (withPrev && prevLetter) {
      const composed = compose(prevLetter, ch);
      if (composed) {
        out = out.slice(0, -prevLetter.length) + composed;
        continue;
      }
    }
    if (nextLetter) {
      const composed = compose(nextLetter, ch);
      if (composed) {
        // "Revoluç ˜ao": nenhuma palavra começa com ã/õ, então o espaço antes
        // do til era só o vão entre os glifos.
        if (ch === "˜" && out.endsWith(" ") && /\p{L} $/u.test(out)) out = out.slice(0, -1);
        out += composed;
        i = nextIndex;
        continue;
      }
    }
    out += ch;
  }

  // Combinante antes da letra (ordem invertida) vai para depois dela.
  return out.replace(/(^|[^\p{L}])([\u0300-\u036f]+)(\p{L})/gu, "$1$3$2").normalize("NFC");
}

export function normalizeChars(s: string): string {
  return repairAccents(s)
    .replace(/[ﬀ-ﬆ]/g, (ch) => LIGATURES[ch] ?? ch)
    .replace(/[\uF001\uF002]/g, (ch) => PRIVATE_USE[ch])
    // Outros glifos privados e o caractere de substituição: sem tradução possível.
    .replace(/[\uE000-\uF8FF\uFFFD]/g, "")
    .replace(/­/g, "") // soft hyphen
    .replace(/[  -   　]/g, " ") // espaços especiais
    .replace(/[​-‍﻿]/g, "") // zero-width
    .replace(/\p{Cc}/gu, (ch) => (ch === "\n" ? ch : " ")) // controles → espaço
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Texto de uma página que saiu ilegível: fonte sem tabela de caracteres
 * (ToUnicode) faz o pdf.js devolver símbolos ou letras trocadas. Nesses casos
 * a página vai para o OCR, que lê o que está desenhado.
 */
export function looksGarbled(text: string): boolean {
  const chars = text.replace(/\s/g, "");
  if (chars.length < 80) return false;
  const odd = chars.match(/[^\p{L}\p{N}\p{P}\p{Sc}°ºª§+=<>|~^`´¨]/gu)?.length ?? 0;
  const privateOrBroken = chars.match(/[\uE000-\uF8FF\uFFFD]/gu)?.length ?? 0;
  // Vogais só entre as letras latinas: trechos em russo ou grego (epígrafes,
  // citações) são legítimos e não podem mandar a página para o OCR em português.
  const letters = chars.match(/\p{Script=Latin}/gu) ?? [];
  const vowels = letters.filter((l) => /[aeiouyáàâãéêíóôõúü]/iu.test(l)).length;
  return (
    privateOrBroken / chars.length > 0.03 ||
    odd / chars.length > 0.15 ||
    (letters.length >= 80 && vowels / letters.length < 0.25)
  );
}

/**
 * Fração das "palavras" de um texto que parecem palavras de verdade: letras,
 * com vogal (ou palavra de uma letra só, como "a", "é"). OCR de manchas,
 * fotos e ornamentos produz coisas como `TE "USE rm % "TH`, que pontuam baixo.
 */
export function wordQuality(text: string): number {
  const tokens = text
    .split(/\s+/)
    .map((t) => t.replace(/^[«“"'‘(\[—–-]+|[»”"'’)\].,;:!?…—–-]+$/gu, ""))
    .filter(Boolean);
  if (tokens.length === 0) return 0;
  const good = tokens.filter((t) => {
    if (/^\d+(?:[.,]\d+)*%?$/.test(t)) return true; // números (anos, páginas)
    if (!/^\p{L}[\p{L}'’-]*$/u.test(t)) return false;
    if (t.length === 1) return /^[aeoéààÉAEOÀ]$/u.test(t);
    // Vogal latina, ou outra escrita (russo etc.); sem maiúsculas no meio ("GQue").
    const vowel = /[aeiouyáàâãéêíóôõúü]/iu.test(t) || !/\p{Script=Latin}/u.test(t);
    return vowel && !/^\p{Lu}{2}\p{Ll}/u.test(t);
  }).length;
  return good / tokens.length;
}

function headerKey(line: string): string {
  // Números variam entre páginas ("Capítulo 3 · 41"), então viram curinga.
  return line
    .replace(HEADING_MARK, "")
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

/** Bordas pela ordem das linhas: as `edge` primeiras e últimas não vazias. */
export function orderEdges(lines: string[], edge = 2): number[] {
  const filled = lines.flatMap((l, i) => (l.trim() ? [i] : []));
  return [...new Set([...filled.slice(0, edge), ...filled.slice(-edge)])];
}

/**
 * Remove linhas que se repetem no topo/base de muitas páginas (título do livro,
 * nome do capítulo, autor, cabeçalho de impressão) e números de página soltos.
 *
 * `edgeIndexes` diz quais linhas de cada página estão nas bordas. Para texto
 * puro é a ordem das linhas; o extrator de PDF usa a posição vertical, porque
 * a ordem interna do PDF nem sempre é a visual (navegadores, por exemplo,
 * desenham o cabeçalho de impressão depois do corpo).
 */
export function stripRunningHeaders<T>(
  pages: T[][],
  text: (line: T) => string,
  edgeIndexes: (lines: T[]) => number[] = (lines) => orderEdges(lines.map(text)),
): T[][] {
  const counts = new Map<string, number>();

  for (const lines of pages) {
    const seen = new Set<string>();
    for (const i of edgeIndexes(lines)) seen.add(headerKey(text(lines[i])));
    for (const key of seen) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const threshold = Math.max(3, Math.ceil(pages.length * 0.4));

  return pages.map((lines) => {
    const drop = new Set(
      edgeIndexes(lines).filter((i) => {
        const line = text(lines[i]).trim();
        if (PAGE_NUMBER.test(line)) return true;
        // Cabeçalhos são títulos, nomes, datas: não começam em minúscula. Já a
        // continuação de uma frase que atravessa a página costuma começar.
        // Só vale para prosa (com espaços e sem cara de endereço): URLs e nomes
        // de arquivo começam em minúscula e são justamente rodapés de impressão.
        const prose = /\s/.test(line) && !/^(?:https?:\/\/|www\.)/i.test(line);
        if (/^\p{Ll}/u.test(line) && prose) return false;
        return (counts.get(headerKey(line)) ?? 0) >= threshold;
      }),
    );
    return lines.filter((_, i) => !drop.has(i));
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function headingOf(line: string): number {
  return HEADING_MARK.exec(line)?.[1].length ?? 0;
}

/**
 * Junta as linhas em um texto onde "\n" = quebra visual (a desfazer) e
 * "\n\n" = parágrafo real. Uma quebra vira parágrafo quando:
 *   - há espaçamento vertical extra (linha vazia vinda do extrator), ou
 *   - a linha atual ou a anterior é um título (`# ...`), ou
 *   - a linha começa com travessão de diálogo, ou
 *   - a linha anterior termina uma frase E é visivelmente mais curta que a
 *     largura típica do bloco (a última linha de um parágrafo não vai até a margem), ou
 *   - as duas linhas são bem curtas: sequência de itens (índice, lista, versos).
 *
 * Um título longo quebrado em várias linhas (mesmo nível, sem espaço entre elas)
 * é reunido numa linha só.
 *
 * Ilustrações (`![LxA](arquivo)`) são blocos próprios. Uma ilustração no meio
 * de uma frase (a figura no alto da página seguinte, por exemplo) espera o fim
 * do parágrafo para não partir o texto em dois.
 */
export function markParagraphs(
  lines: string[],
  shortLineRatio = 0.8,
  listLineRatio = 0.6,
): string {
  const lengths = lines
    .filter((l) => !headingOf(l) && !IMAGE_MARK.test(l.trim()))
    .map((l) => l.length)
    .filter((n) => n > 20);
  const typical = median(lengths);
  const isListLine = (l: string) => typical > 0 && l.length < typical * listLineRatio;

  let out = "";
  let prev: string | null = null;
  let gap = false;
  const pendingImages: string[] = [];
  const flushImages = () => {
    for (const image of pendingImages) out += (out ? "\n\n" : "") + image;
    pendingImages.length = 0;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      gap = true;
      continue;
    }

    if (IMAGE_MARK.test(line)) {
      const midSentence = prev !== null && !headingOf(prev) && !SENTENCE_END.test(prev);
      if (midSentence) {
        pendingImages.push(line);
        continue;
      }
      flushImages();
      out += (out ? "\n\n" : "") + line;
      prev = null;
      gap = false;
      continue;
    }

    const heading = headingOf(line);
    const prevHeading = prev === null ? 0 : headingOf(prev);

    if (prev !== null) {
      if (heading && heading === prevHeading && !gap) {
        out += " " + line.replace(HEADING_MARK, "");
        prev = line;
        continue;
      }

      const endsSentence = SENTENCE_END.test(prev);
      const isShort = typical > 0 && prev.length < typical * shortLineRatio;
      const breakHere =
        gap ||
        heading > 0 ||
        prevHeading > 0 ||
        DIALOGUE_START.test(line) ||
        (endsSentence && isShort) ||
        (isListLine(prev) && isListLine(line));
      if (breakHere) flushImages();
      out += breakHere ? "\n\n" : "\n";
    } else if (out) {
      out += "\n\n";
    }

    out += line;
    prev = line;
    gap = false;
  }
  flushImages();

  return out;
}

/** Desfaz hifenização e quebras de linha visuais, preservando parágrafos. */
export function joinLines(text: string): string {
  return (
    text
      // Composto partido no hífen: pela norma, o pt-BR repete o hífen na linha
      // seguinte ("bem-\n-vindo"). Mantém um único hífen.
      .replace(/(\p{L})-[ \t]*\n[ \t]*-(?=\p{L})/gu, "$1-")
      // Hifenização silábica: "pala-\nvra" → "palavra" (só se continua em minúscula).
      .replace(/(\p{L})[-‐][ \t]*\n[ \t]*(?=\p{Ll})/gu, "$1")
      // Quebra simples (sem outra antes ou depois) vira espaço.
      .replace(/(?<!\n)[ \t]*\n(?!\n)[ \t]*/g, " ")
      // Normaliza separadores de parágrafo.
      .replace(/\s*\n{2,}\s*/g, "\n\n")
      // Espaço antes de pontuação ("palavra ," → "palavra,").
      .replace(/ +([,.;:!?…)\]»”])/g, "$1")
      .replace(/([(\[«“]) +/g, "$1")
      .replace(/ {2,}/g, " ")
      .trim()
  );
}

/** Pipeline completo a partir das linhas de cada página. */
export function cleanExtractedText(
  pages: string[][],
  { stripHeaders = true }: { stripHeaders?: boolean } = {},
): string {
  const normalized = pages.map((lines) =>
    lines.map((l) => (l ? normalizeChars(l) : "")),
  );
  const body = stripHeaders ? stripRunningHeaders(normalized, (l) => l) : normalized;
  return joinLines(markParagraphs(body.flat()));
}

/** Atalho para texto já achatado (ex.: saída do `pdf-parse` no servidor). */
export function cleanPlainText(text: string): string {
  const pages = text.split("\f").map((page) => page.split(/\r?\n/));
  return cleanExtractedText(pages);
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}
