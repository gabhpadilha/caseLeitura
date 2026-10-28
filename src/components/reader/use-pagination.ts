"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/** A partir desta largura (px) o leitor mostra duas páginas lado a lado. */
const SPREAD_MIN_WIDTH = 900;

/** Largura máxima de uma coluna de texto (~65–75 caracteres por linha). */
const MAX_COLUMN_TEXT = 640;

interface UsePaginationOptions {
  /** Fração já lida (0–1), usada para restaurar a posição ao abrir. */
  initialFraction: number;
  /** Muda sempre que o fluxo do texto muda (conteúdo, fonte, espaçamento). */
  layoutKey: string;
  /** Os elementos só existem depois que o texto carregou. */
  enabled: boolean;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Paginação por tela com CSS multi-column.
 *
 * - `viewportRef`: contêiner de rolagem com overflow oculto; sua largura é uma "tela".
 * - trilho (`trackStyle`): largura exata de todas as páginas, para a rolagem
 *   alcançar a última tela mesmo quando ela tem só uma das duas colunas.
 * - `contentRef`: o texto, em colunas de altura fixa. Com `column-count = k` e
 *   `column-gap = 2 × padding`, o passo entre colunas é largura / k, então k
 *   colunas formam uma tela e as seguintes continuam à direita.
 * - `endRef`: marcador vazio no fim do texto; a coluna em que ele cai dá o total.
 *
 * Virar a página é rolar o contêiner uma largura de tela. Rolagem nativa só
 * desenha a parte visível; um translateX no livro inteiro (centenas de milhares
 * de pixels de largura) travava a tela a cada página.
 */
export function usePagination({ initialFraction, layoutKey, enabled }: UsePaginationOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(0);
  const [fontsVersion, setFontsVersion] = useState(0);

  // Posição como fração do livro: sobrevive a mudanças de fonte e de tela.
  const fractionRef = useRef(initialFraction);
  // A próxima rolagem deve animar? Só viradas de página pelo usuário animam.
  const smoothRef = useRef(false);

  const columns = width >= SPREAD_MIN_WIDTH ? 2 : 1;
  // Margem mínima proporcional à tela; em telas largas cresce para limitar o
  // comprimento da linha. Qualquer valor funciona, pois o gap é sempre 2 × margem.
  const padding = Math.round(
    Math.max(clamp(width * 0.05, 20, 56), (width / columns - MAX_COLUMN_TEXT) / 2),
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!enabled || !el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  // Web fonts que terminam de carregar depois mudam a métrica do texto.
  useEffect(() => {
    const bump = () => setFontsVersion((v) => v + 1);
    document.fonts.ready.then(bump);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);

  // Mede quantas telas o texto ocupa e reposiciona na mesma fração do livro.
  useLayoutEffect(() => {
    const content = contentRef.current;
    const end = endRef.current;
    if (!enabled || !content || !end || width === 0) return;

    // A rolagem desloca os dois elementos igualmente, então a diferença é estável.
    const offset = end.getBoundingClientRect().left - content.getBoundingClientRect().left;
    const pitch = width / columns;
    const lastColumn = Math.max(0, Math.floor((offset - padding) / pitch + 0.01));
    const count = Math.ceil((lastColumn + 1) / columns);
    const target = clamp(Math.ceil(fractionRef.current * count) - 1, 0, count - 1);

    smoothRef.current = false; // reposicionamento por mudança de layout não anima
    setPageCount(count);
    setPage(target);
  }, [enabled, width, columns, padding, layoutKey, fontsVersion]);

  // Rola até a página atual. Roda depois do commit, quando o trilho já tem a
  // largura de `pageCount` páginas (antes disso a rolagem seria limitada).
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!enabled || !viewport || width === 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smooth = smoothRef.current && !reduceMotion;
    smoothRef.current = false;
    viewport.scrollTo({ left: page * width, behavior: smooth ? "smooth" : "auto" });
  }, [enabled, page, pageCount, width]);

  const goTo = useCallback(
    (target: number, { smooth = true }: { smooth?: boolean } = {}) => {
      const next = clamp(target, 0, pageCount - 1);
      fractionRef.current = (next + 1) / pageCount;
      smoothRef.current = smooth;
      setPage(next);
    },
    [pageCount],
  );

  const trackStyle: CSSProperties = { width: width ? pageCount * width : undefined };

  const contentStyle: CSSProperties = {
    width: width || undefined,
    columnCount: columns,
    columnGap: padding * 2,
    columnFill: "auto",
    paddingInline: padding,
  };

  return {
    viewportRef,
    contentRef,
    endRef,
    trackStyle,
    contentStyle,
    columns,
    page,
    pageCount,
    goTo,
    next: () => goTo(page + 1),
    prev: () => goTo(page - 1),
    /** Fração lida até o fim da página atual (0–1). */
    fraction: (page + 1) / pageCount,
  };
}
