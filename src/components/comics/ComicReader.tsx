"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Palette, ZoomIn, ZoomOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { progressPatch, saveProgress, sendProgressOnExit } from "@/lib/books/progress";
import {
  COMIC_FILTER_LABEL,
  comicFilterStyle,
  getComicFilter,
  getServerComicFilter,
  paperGrainUrl,
  setComicFilter,
  subscribeComicFilter,
  type ComicFilter,
  type ComicFilterMode,
} from "@/lib/comics/filters";
import type { Book, BookUpdate } from "@/types/book";

interface ComicReaderProps {
  book: Book;
  /** Signed URLs das páginas, na ordem. */
  pages: string[];
}

const SAVE_DELAY_MS = 800;
/** Toque nas laterais (fração da largura) vira a página; o centro mostra/oculta a interface. */
const EDGE_ZONE = 0.3;
const SWIPE_MIN_PX = 40;
/** Janela do toque duplo (zoom) no centro da tela. */
const DOUBLE_TAP_MS = 280;
const ZOOM = 2;
/** Deitado e largo o bastante: duas páginas lado a lado, como a revista aberta. */
const TWO_UP_QUERY = "(orientation: landscape) and (min-width: 900px)";

function subscribeTwoUp(onChange: () => void) {
  const media = window.matchMedia(TWO_UP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const noSubscribe = () => () => {};

/** Capa sozinha; depois pares (2–3, 4–5…), como numa revista. */
function buildSpreads(count: number, twoUp: boolean): number[][] {
  if (!twoUp) return Array.from({ length: count }, (_, i) => [i]);
  const spreads: number[][] = count > 0 ? [[0]] : [];
  for (let i = 1; i < count; i += 2) spreads.push(i + 1 < count ? [i, i + 1] : [i]);
  return spreads;
}

/** Página da posição salva (mesma tolerância do leitor de livros). */
function pageFromProgress(progress: number, count: number) {
  return Math.min(count - 1, Math.max(0, Math.ceil((progress / 100) * count - 0.1) - 1));
}

export function ComicReader({ book, pages }: ComicReaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const count = pages.length;
  // Preferências do aparelho: o servidor renderiza o padrão; o browser, o real.
  const twoUp = useSyncExternalStore(subscribeTwoUp, () => window.matchMedia(TWO_UP_QUERY).matches, () => false);
  const filter = useSyncExternalStore(subscribeComicFilter, getComicFilter, getServerComicFilter);
  const grain = useSyncExternalStore(noSubscribe, paperGrainUrl, () => "");
  const [current, setCurrent] = useState(() => (count ? pageFromProgress(book.progress, count) : 0));
  const [chromeVisible, setChromeVisible] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const changeFilter = (next: ComicFilter) => setComicFilter(next);

  const spreads = useMemo(() => buildSpreads(count, twoUp), [count, twoUp]);
  const spreadIndex = Math.max(0, spreads.findIndex((s) => s.includes(current)));
  const spread = useMemo(() => spreads[spreadIndex] ?? [], [spreads, spreadIndex]);
  const lastShown = spread[spread.length - 1] ?? 0;
  const fraction = count ? (lastShown + 1) / count : 0;

  // Já baixa as páginas vizinhas: a virada fica instantânea.
  useEffect(() => {
    for (const s of [spreads[spreadIndex + 1], spreads[spreadIndex - 1]]) {
      for (const i of s ?? []) new Image().src = pages[i];
    }
  }, [spreadIndex, spreads, pages]);

  // A miniatura da página atual fica à vista na faixa.
  useEffect(() => {
    if (!chromeVisible) return;
    thumbsRef.current
      ?.querySelector<HTMLElement>(`[data-thumb="${spread[0]}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [spread, chromeVisible]);

  // --- Progresso (mesma estratégia do leitor de livros) ----------------------
  const turnedPage = useRef(false);
  const statusRef = useRef(book.status);
  const startedAtRef = useRef(book.started_at);
  const pendingRef = useRef<number | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null;
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const markSaved = (patch: BookUpdate) => {
    if (patch.status) statusRef.current = patch.status;
    if (patch.started_at) startedAtRef.current = patch.started_at;
  };

  useEffect(() => {
    if (!turnedPage.current) return;
    pendingRef.current = fraction;
    const t = setTimeout(async () => {
      if (pendingRef.current !== fraction) return;
      const patch = progressPatch(fraction, statusRef.current, startedAtRef.current);
      try {
        await saveProgress(supabase, book.id, patch);
        markSaved(patch);
        if (pendingRef.current === fraction) pendingRef.current = null;
      } catch (err) {
        console.error("Não foi possível salvar o progresso", err);
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [fraction, book.id, supabase]);

  useEffect(() => {
    const flush = () => {
      const pending = pendingRef.current;
      const token = tokenRef.current;
      if (pending === null || !token) return;
      const patch = progressPatch(pending, statusRef.current, startedAtRef.current);
      sendProgressOnExit(book.id, patch, token);
      markSaved(patch);
      pendingRef.current = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [book.id]);

  // --- Navegação -------------------------------------------------------------
  const goToSpread = (index: number, { immersive = true } = {}) => {
    const target = spreads[Math.min(spreads.length - 1, Math.max(0, index))];
    if (!target || target[0] === spread[0]) return;
    turnedPage.current = true;
    setCurrent(target[0]);
    setZoomed(false);
    if (immersive) {
      setChromeVisible(false);
      setPanelOpen(false);
    }
  };
  const turn = (direction: 1 | -1, options?: { immersive?: boolean }) =>
    goToSpread(spreadIndex + direction, options);
  const seekPage = (page: number) => {
    turnedPage.current = true;
    setCurrent(Math.min(count - 1, Math.max(0, page)));
    setZoomed(false);
  };

  const keyActions = useRef({ turn, seekPage });
  useEffect(() => {
    keyActions.current = { turn, seekPage };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const a = keyActions.current;
      const handlers: Record<string, () => void> = {
        ArrowRight: () => a.turn(1),
        PageDown: () => a.turn(1),
        " ": () => a.turn(1),
        ArrowLeft: () => a.turn(-1),
        PageUp: () => a.turn(-1),
        Home: () => a.seekPage(0),
        End: () => a.seekPage(Number.MAX_SAFE_INTEGER),
        Escape: () => {
          setZoomed(false);
          setPanelOpen(false);
        },
      };
      const handler = handlers[e.key];
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Zoom: amplia em volta do ponto tocado; com zoom, arrastar move a página.
  const toggleZoom = (clientX?: number, clientY?: number) => {
    const stage = stageRef.current;
    if (zoomed || !stage) return setZoomed(false);
    const rect = stage.getBoundingClientRect();
    const fx = clientX === undefined ? 0.5 : (clientX - rect.left) / rect.width;
    const fy = clientY === undefined ? 0.5 : (clientY - rect.top) / rect.height;
    setZoomed(true);
    requestAnimationFrame(() => {
      stage.scrollLeft = fx * stage.scrollWidth - rect.width / 2;
      stage.scrollTop = fy * stage.scrollHeight - rect.height / 2;
    });
  };

  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef(0);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerStart.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    if (panelOpen) return setPanelOpen(false);

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    // Com zoom, arrastar é rolar a página ampliada, não virar.
    if (!zoomed && Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      return turn(dx < 0 ? 1 : -1);
    }
    if (Math.hypot(dx, dy) > 10 || e.timeStamp - start.t > 500) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (!zoomed && x < EDGE_ZONE) return turn(-1);
    if (!zoomed && x > 1 - EDGE_ZONE) return turn(1);

    // Centro: toque duplo = zoom; toque simples (depois da janela) = interface.
    if (e.timeStamp - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      if (chromeTimer.current) clearTimeout(chromeTimer.current);
      return toggleZoom(e.clientX, e.clientY);
    }
    lastTap.current = e.timeStamp;
    chromeTimer.current = setTimeout(() => setChromeVisible((v) => !v), DOUBLE_TAP_MS);
  };

  const style = comicFilterStyle(filter);
  const fade = chromeVisible ? "opacity-100" : "pointer-events-none opacity-0";
  const pageLabel =
    spread.length > 1 ? `pág. ${spread[0] + 1}–${spread[1] + 1} de ${count}` : `pág. ${spread[0] + 1} de ${count}`;
  const iconButton =
    "flex size-10 items-center justify-center rounded-full text-[#eee8dc] transition-colors hover:bg-white/10 disabled:opacity-30";

  if (count === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#1b1a17] px-8 text-center text-[#cfc9bd]">
        <p>Não encontramos as páginas deste quadrinho.</p>
        <Link href={`/livros/${book.id}`} className="rounded-full px-4 py-2 ring-1 ring-white/30">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#1b1a17] text-[#eee8dc]">
      <header
        className={`absolute inset-x-0 top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-[#1b1a17]/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-sm transition-opacity duration-200 sm:px-8 ${fade}`}
      >
        <Link
          href={`/livros/${book.id}`}
          className="flex items-center gap-1 justify-self-start rounded-full px-2 py-1 text-sm font-medium text-[#cfc9bd] hover:bg-white/10"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Voltar
        </Link>
        <p className="max-w-[55vw] truncate text-center font-display text-lg">
          {book.title}
          {book.author && <span className="hidden text-[#a9a296] sm:inline"> · <em>{book.author}</em></span>}
        </p>
        <p className="justify-self-end text-sm text-[#a9a296] tabular-nums">{pageLabel}</p>
      </header>

      <main
        className="absolute inset-0 touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointerStart.current = null)}
      >
        <div
          ref={stageRef}
          className={`size-full ${zoomed ? "touch-pan-x touch-pan-y overflow-auto" : "overflow-hidden"}`}
        >
          <div
            className="flex h-full items-stretch justify-center gap-1 px-2 py-[max(0.5rem,env(safe-area-inset-top))]"
            style={zoomed ? { width: `${ZOOM * 100}%`, height: `${ZOOM * 100}%` } : undefined}
          >
            {spread.map((index, i) => {
              // Na revista aberta, as páginas se encostam no meio.
              const align = spread.length > 1 ? (i === 0 ? "object-right" : "object-left") : "object-center";
              return (
                <div key={index} className="relative min-w-0 flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL do Storage */}
                  <img
                    src={pages[index]}
                    alt={`Página ${index + 1}`}
                    draggable={false}
                    className={`absolute inset-0 size-full object-contain ${align}`}
                    style={{ filter: style.image }}
                  />
                  <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ background: style.tint }} />
                  {grain && style.grain > 0 && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 mix-blend-multiply"
                      style={{ backgroundImage: `url(${grain})`, opacity: style.grain }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Interface de baixo: filtro, zoom e miniaturas */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-opacity duration-200 ${fade}`}
      >
        {panelOpen && (
          <section
            aria-label="Filtro de leitura"
            className="w-full max-w-xl rounded-[1.75rem] bg-[#1c1a17]/95 p-4 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center justify-between text-xs text-[#a9a296]">
              <span>Filtro de leitura</span>
              <span>Intensidade</span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 rounded-full bg-white/[0.07] p-1" role="radiogroup" aria-label="Filtro">
                {(Object.keys(COMIC_FILTER_LABEL) as ComicFilterMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={filter.mode === mode}
                    onClick={() => changeFilter({ ...filter, mode })}
                    className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                      filter.mode === mode ? "bg-paper font-semibold text-ink" : "text-[#cfc9bd] hover:bg-white/10"
                    }`}
                  >
                    {COMIC_FILTER_LABEL[mode]}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={filter.strength}
                disabled={filter.mode === "original"}
                onChange={(e) => changeFilter({ ...filter, strength: Number(e.target.value) })}
                aria-label="Intensidade do filtro"
                className="w-40 accent-coral disabled:opacity-30"
              />
            </div>
          </section>
        )}

        <nav aria-label="Controles do quadrinho" className="flex w-full max-w-3xl items-center gap-1 rounded-full bg-[#1c1a17]/90 p-1.5 shadow-xl backdrop-blur">
          <button type="button" className={iconButton} onClick={() => turn(-1, { immersive: false })} disabled={spreadIndex === 0} aria-label="Página anterior">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <div ref={thumbsRef} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
            {pages.map((src, i) => {
              const active = spread.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  data-thumb={i}
                  onClick={() => seekPage(i)}
                  aria-label={`Ir para a página ${i + 1}`}
                  aria-current={active ? "page" : undefined}
                  className={`h-11 w-8 shrink-0 overflow-hidden rounded-[3px] transition-opacity ${
                    active ? "opacity-100 ring-2 ring-coral" : "opacity-50 hover:opacity-90"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL do Storage */}
                  <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                </button>
              );
            })}
          </div>
          <button type="button" className={iconButton} onClick={() => turn(1, { immersive: false })} disabled={spreadIndex === spreads.length - 1} aria-label="Próxima página">
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden />
          <button type="button" className={iconButton} onClick={() => toggleZoom()} aria-label={zoomed ? "Tirar zoom" : "Ampliar"} aria-pressed={zoomed}>
            {zoomed ? <ZoomOut className="size-[1.15rem]" aria-hidden /> : <ZoomIn className="size-[1.15rem]" aria-hidden />}
          </button>
          <button
            type="button"
            className={`${iconButton} ${panelOpen ? "bg-white/15" : ""}`}
            onClick={() => setPanelOpen((v) => !v)}
            aria-label="Filtro de leitura"
            aria-expanded={panelOpen}
          >
            <Palette className="size-[1.15rem]" aria-hidden />
          </button>
        </nav>
      </div>
    </div>
  );
}
