// Filtros de leitura dos quadrinhos: deixam a página com cara de papel e cansam menos a vista.

export type ComicFilterMode = "original" | "paper" | "sepia" | "night";

export interface ComicFilter {
  mode: ComicFilterMode;
  /** Intensidade de 0 a 100. */
  strength: number;
}

export const DEFAULT_COMIC_FILTER: ComicFilter = { mode: "paper", strength: 60 };

export const COMIC_FILTER_LABEL: Record<ComicFilterMode, string> = {
  original: "Original",
  paper: "Papel",
  sepia: "Sépia",
  night: "Noite",
};

export interface ComicFilterStyle {
  /** `filter` CSS da imagem. */
  image: string;
  /** Cor multiplicada por cima da página (o branco vira creme). */
  tint: string;
  /** Opacidade da textura de papel. */
  grain: number;
}

/** Estilos do filtro na intensidade escolhida (0 = original). */
export function comicFilterStyle({ mode, strength }: ComicFilter): ComicFilterStyle {
  const s = Math.min(100, Math.max(0, strength)) / 100;
  const n = (v: number) => v.toFixed(3);
  switch (mode) {
    case "paper":
      return {
        image: `sepia(${n(0.35 * s)}) saturate(${n(1 - 0.18 * s)}) contrast(${n(1 - 0.08 * s)}) brightness(${n(1 - 0.03 * s)})`,
        tint: `rgb(243 230 201 / ${n(0.5 * s)})`,
        grain: 0.55 * s,
      };
    case "sepia":
      return {
        image: `sepia(${n(0.85 * s)}) saturate(${n(1 - 0.3 * s)}) contrast(${n(1 - 0.1 * s)}) brightness(${n(1 - 0.04 * s)})`,
        tint: `rgb(233 210 166 / ${n(0.35 * s)})`,
        grain: 0.75 * s,
      };
    case "night":
      return {
        image: `brightness(${n(1 - 0.4 * s)}) sepia(${n(0.3 * s)}) saturate(${n(1 - 0.25 * s)}) contrast(${n(1 - 0.1 * s)})`,
        tint: "transparent",
        grain: 0.25 * s,
      };
    default:
      return { image: "none", tint: "transparent", grain: 0 };
  }
}

const STORAGE_KEY = "caseLeitura:hq-filter";

// O filtro fica no aparelho (cada tela pede um ajuste diferente). Lido via
// useSyncExternalStore: o servidor usa o padrão e o browser, o salvo.
let cached: ComicFilter | null = null;
const listeners = new Set<() => void>();

function readSaved(): ComicFilter {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<ComicFilter> | null;
    if (saved && saved.mode && saved.mode in COMIC_FILTER_LABEL && typeof saved.strength === "number") {
      return { mode: saved.mode, strength: saved.strength };
    }
  } catch {
    // Armazenamento bloqueado (aba privada): usa o padrão.
  }
  return DEFAULT_COMIC_FILTER;
}

export function getComicFilter(): ComicFilter {
  cached ??= readSaved();
  return cached;
}

export function getServerComicFilter(): ComicFilter {
  return DEFAULT_COMIC_FILTER;
}

export function subscribeComicFilter(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setComicFilter(filter: ComicFilter): void {
  cached = filter;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
  } catch {
    // Sem armazenamento: o filtro vale só nesta visita.
  }
  listeners.forEach((l) => l());
}

/** Textura de papel: ruído gerado uma vez num canvas pequeno e repetido como fundo. */
let grainUrl: string | null = null;
export function paperGrainUrl(): string {
  if (grainUrl) return grainUrl;
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + Math.random() * 60;
    img.data[i] = v + 25;
    img.data[i + 1] = v + 10;
    img.data[i + 2] = v - 15;
    img.data[i + 3] = Math.random() * 70;
  }
  ctx.putImageData(img, 0, 0);
  grainUrl = canvas.toDataURL("image/png");
  return grainUrl;
}
