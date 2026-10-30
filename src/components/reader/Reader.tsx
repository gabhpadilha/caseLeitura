"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseBlocks, type TextBlock } from "@/lib/reader/blocks";
import { HEADING_CLASSES, readerTextClasses, THEME_CLASSES } from "@/lib/reader/styles";
import { progressPatch, saveProgress, sendProgressOnExit } from "@/lib/books/progress";
import type { Book, BookUpdate } from "@/types/book";
import { settingsToRow, type ReaderSettings } from "@/types/reader";
import { ReaderSettingsPanel } from "./ReaderSettingsPanel";
import { ReaderToolbar } from "./ReaderToolbar";
import { usePagination } from "./use-pagination";

interface ReaderProps {
  book: Book;
  contentUrl: string | null;
  /** Ilustrações do livro: nome do arquivo (como no texto) → signed URL. */
  imageUrls: Record<string, string>;
  initialSettings: ReaderSettings;
}

type ContentState =
  | { status: "loading" }
  | { status: "ready"; blocks: TextBlock[] }
  | { status: "error"; message: string };

const SAVE_DELAY_MS = 800;
// h1 fica para o título da página; os níveis do livro começam em h2.
const HEADING_TAG = { 1: "h2", 2: "h3", 3: "h4" } as const;

/** Toque nas laterais (fração da largura) vira a página; o centro mostra/oculta a interface. */
const EDGE_ZONE = 0.3;
const SWIPE_MIN_PX = 40;

/** Altura livre da página (descontadas a barra de cima e a de baixo) para limitar as ilustrações. */
const PAGE_HEIGHT = "(100dvh - 11rem)";

export function Reader({ book, contentUrl, imageUrls, initialSettings }: ReaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [settings, setSettings] = useState(initialSettings);
  const [content, setContent] = useState<ContentState>(
    contentUrl
      ? { status: "loading" }
      : { status: "error", message: "Este livro ainda não tem texto. Reprocesse na página do livro para ler as páginas escaneadas." },
  );
  const [chromeVisible, setChromeVisible] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  // Ilustração aberta em tela cheia.
  const [zoomed, setZoomed] = useState<string | null>(null);
  // O clique que segue o toque de abrir cai na própria tela cheia: não pode fechá-la.
  const zoomedAt = useRef(0);

  const ready = content.status === "ready";
  const {
    viewportRef,
    contentRef,
    endRef,
    trackStyle,
    contentStyle,
    page,
    pageCount,
    goTo,
    next,
    prev,
    fraction,
  } = usePagination({
    initialFraction: book.progress / 100,
    enabled: ready,
    layoutKey: [
      ready ? content.blocks.length : 0,
      settings.fontSize,
      settings.fontFamily,
      settings.lineHeight,
      settings.textAlign,
    ].join("|"),
  });

  // Baixa o texto limpo direto do Storage (signed URL gerada no servidor).
  useEffect(() => {
    if (!contentUrl) return;
    const controller = new AbortController();
    fetch(contentUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => setContent({ status: "ready", blocks: parseBlocks(text) }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setContent({
          status: "error",
          message: `Não foi possível carregar o texto (${err instanceof Error ? err.message : "erro"}).`,
        });
      });
    return () => controller.abort();
  }, [contentUrl]);

  // Persiste as preferências (debounce) — ignora o valor inicial.
  const firstSettings = useRef(true);
  useEffect(() => {
    if (firstSettings.current) {
      firstSettings.current = false;
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase
        .from("reading_preferences")
        .upsert({ user_id: data.user.id, ...settingsToRow(settings) });
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [settings, supabase]);

  // Progresso: grava só depois que o leitor virou alguma página.
  const turnedPage = useRef(false);
  // Status/início como estão no banco agora (mudam após a 1ª gravação).
  const statusRef = useRef(book.status);
  const startedAtRef = useRef(book.started_at);
  // Fração ainda não confirmada no banco (null = nada pendente).
  const pendingRef = useRef<number | null>(null);
  // Token da sessão para o envio de saída (que não pode esperar o getSession).
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

  // Durante a leitura: grava após uma pausa nas viradas de página.
  useEffect(() => {
    if (!turnedPage.current) return;
    pendingRef.current = fraction;
    const t = setTimeout(async () => {
      // O envio de saída (troca de app) pode já ter gravado esta posição.
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

  // Ao sair do leitor, trocar de app ou fechar o app: envia o que estiver pendente.
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
      flush(); // desmontagem = saiu do leitor (Voltar, estante…)
    };
  }, [book.id]);

  const turn = (direction: 1 | -1, { immersive = true } = {}) => {
    turnedPage.current = true;
    if (direction === 1) next();
    else prev();
    if (immersive) {
      setChromeVisible(false);
      setPanelOpen(false);
    }
  };

  const seek = (target: number) => {
    turnedPage.current = true;
    goTo(target, { smooth: false });
  };

  // Teclado: setas, Page Up/Down, espaço, Home/End.
  const keyActions = useRef({ turn, seek, lastPage: pageCount - 1 });
  useEffect(() => {
    keyActions.current = { turn, seek, lastPage: pageCount - 1 };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        setZoomed(null);
        return setPanelOpen(false);
      }
      const actions = keyActions.current;
      const handlers: Record<string, () => void> = {
        ArrowRight: () => actions.turn(1),
        PageDown: () => actions.turn(1),
        " ": () => actions.turn(1),
        ArrowLeft: () => actions.turn(-1),
        PageUp: () => actions.turn(-1),
        Home: () => actions.seek(0),
        End: () => actions.seek(actions.lastPage),
      };
      const handler = handlers[e.key];
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Gestos: deslizar vira a página; toque nas bordas vira; toque no centro alterna a interface.
  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerStart.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    if (panelOpen) return setPanelOpen(false);
    // Seleção de texto (toque longo ou arrasto) não deve virar a página.
    if (window.getSelection()?.toString()) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      return turn(dx < 0 ? 1 : -1);
    }
    if (Math.hypot(dx, dy) > 10 || e.timeStamp - start.t > 500) return;

    // Toque numa ilustração abre em tela cheia.
    if (e.target instanceof HTMLImageElement && e.target.dataset.zoom) {
      zoomedAt.current = e.timeStamp;
      return setZoomed(e.target.dataset.zoom);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < EDGE_ZONE) turn(-1);
    else if (x > 1 - EDGE_ZONE) turn(1);
    else setChromeVisible((v) => !v);
  };

  // O texto não muda entre renders; memoizar evita refazer milhares de blocos.
  const blocks = ready ? content.blocks : null;
  const textNodes = useMemo(
    () =>
      blocks?.map((block, i) => {
        if (block.kind === "paragraph") return <p key={i}>{block.text}</p>;
        if (block.kind === "image") {
          const src = imageUrls[block.file];
          if (!src) return null;
          const ratio = block.width / block.height;
          return (
            <figure key={i} className="my-[1em] break-inside-avoid">
              {/* Tamanho reservado pelas dimensões: a paginação não muda quando a imagem chega. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL do Storage, sem otimização */}
              <img
                src={src}
                alt="Ilustração do livro"
                data-zoom={src}
                width={block.width}
                height={block.height}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="mx-auto h-auto cursor-zoom-in rounded-sm"
                style={{
                  aspectRatio: `${block.width} / ${block.height}`,
                  width: `min(100%, ${block.width}px, calc(${PAGE_HEIGHT} * ${ratio.toFixed(4)}))`,
                }}
              />
            </figure>
          );
        }
        const Heading = HEADING_TAG[block.level];
        return (
          <Heading key={i} className={HEADING_CLASSES[block.level]}>
            {block.text}
          </Heading>
        );
      }),
    [blocks, imageUrls],
  );

  const theme = THEME_CLASSES[settings.theme];
  const fade = chromeVisible ? "opacity-100" : "pointer-events-none opacity-0";

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden transition-colors ${theme.page}`}>
      <header
        className={`absolute inset-x-0 top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-current/10 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-sm transition-opacity duration-200 sm:px-8 ${fade}`}
      >
        <Link
          href={`/livros/${book.id}`}
          className={`flex items-center gap-1 justify-self-start rounded-full px-2 py-1 text-sm font-medium ${theme.chromeHover}`}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Voltar
        </Link>
        <p className="max-w-[55vw] truncate text-center font-display text-lg">
          {book.title}
          {book.author && (
            <span className="hidden sm:inline">
              {" "}
              · <em className={theme.muted}>{book.author}</em>
            </span>
          )}
        </p>
        <p className={`justify-self-end text-sm tabular-nums ${theme.muted}`}>
          {ready && `pág. ${page + 1} de ${pageCount}`}
        </p>
      </header>

      <main
        className="relative min-h-0 flex-1 touch-pan-y select-text pt-[max(4.25rem,env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointerStart.current = null)}
      >
        {content.status === "loading" && (
          <p className={`flex h-full items-center justify-center gap-2 ${theme.muted}`}>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando texto…
          </p>
        )}
        {content.status === "error" && (
          <p className={`flex h-full items-center justify-center px-8 text-center ${theme.muted}`}>
            {content.message}
          </p>
        )}
        {ready && (
          <div ref={viewportRef} className="mx-auto h-full max-w-[1200px] overflow-hidden">
            <div style={trackStyle} className="h-full">
              {/* overflow-wrap: anywhere quebra URLs e palavras sem espaço que
                  não cabem na coluna, em vez de vazarem sobre a vizinha. */}
              <div
                ref={contentRef}
                lang="pt-BR"
                style={contentStyle}
                className={`h-full w-full [overflow-wrap:anywhere] [&>p]:indent-[1.5em] ${readerTextClasses(settings)}`}
              >
                {textNodes}
                <div ref={endRef} aria-hidden />
              </div>
            </div>
          </div>
        )}
      </main>

      {ready && (
        <p
          className={`absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs tabular-nums transition-opacity duration-200 ${theme.muted} ${
            chromeVisible ? "opacity-0" : "opacity-100"
          }`}
          aria-live="polite"
        >
          {page + 1} de {pageCount}
        </p>
      )}

      <div
        className={`absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-3 px-4 transition-opacity duration-200 ${fade}`}
      >
        {panelOpen && (
          <ReaderSettingsPanel settings={settings} onChange={setSettings} theme={theme} />
        )}
        <ReaderToolbar
          theme={theme}
          currentTheme={settings.theme}
          page={page}
          pageCount={pageCount}
          disabled={!ready}
          settingsOpen={panelOpen}
          onPrev={() => turn(-1, { immersive: false })}
          onNext={() => turn(1, { immersive: false })}
          onSeek={seek}
          onCycleTheme={() =>
            setSettings((s) => ({ ...s, theme: THEME_CLASSES[s.theme].dark ? "light" : "dark" }))
          }
          onToggleSettings={() => setPanelOpen((v) => !v)}
        />
      </div>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ilustração em tela cheia"
          onClick={(e) => {
            if (e.timeStamp - zoomedAt.current > 400) setZoomed(null);
          }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/90 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL do Storage */}
          <img src={zoomed} alt="Ilustração do livro" className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={() => setZoomed(null)}
            aria-label="Fechar ilustração"
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
