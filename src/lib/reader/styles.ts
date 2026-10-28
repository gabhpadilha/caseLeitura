import type {
  FontSizeStep,
  ReaderFont,
  ReaderLeading,
  ReaderSettings,
  ReaderTextAlign,
  ReaderTheme,
} from "@/types/reader";

// Classes escritas por extenso: o Tailwind só gera o CSS das classes que
// encontra literalmente no código, então nada de `text-${size}`.

export interface ThemeClasses {
  /** Fundo e cor do texto da página. */
  page: string;
  /** Texto secundário (número da página, avisos). */
  muted: string;
  /** Barra flutuante e painel de ajustes. */
  chrome: string;
  /** Botão ativo/hover dentro da barra. */
  chromeHover: string;
  /** Trilho da barra de progresso. */
  track: string;
  /** Cor de destaque do tema, usada na seleção de texto. */
  selection: string;
  /** Miniatura "Aa" no painel de aparência. */
  swatch: string;
  /** Tema escuro? (decide contrastes no painel). */
  dark: boolean;
}

/**
 * Os nove temas do design system ("Nove jeitos de ler"): quatro claros, um de
 * alto contraste e quatro escuros, todos com texto acima de 4,5:1. Os ids
 * light/sepia/dark são anteriores e equivalem a Papel/Sépia/Noite.
 */
export const THEME_CLASSES: Record<ReaderTheme, ThemeClasses> = {
  light: {
    page: "bg-[#FBF7EE] text-[#2B2620]",
    muted: "text-[#8C8475]",
    chrome: "bg-[#F3EEE3]/95 text-[#24232B] shadow-lg shadow-black/10 ring-1 ring-black/5",
    chromeHover: "hover:bg-black/5",
    track: "bg-black/10",
    selection: "selection:bg-[#F2CFC4]",
    swatch: "bg-[#FBF7EE] text-[#2B2620]",
    dark: false,
  },
  sepia: {
    page: "bg-[#F1E3C6] text-[#4A3420]",
    muted: "text-[#8E7356]",
    chrome: "bg-[#F8EDD5]/95 text-[#4A3420] shadow-lg shadow-[#4A3420]/15 ring-1 ring-[#4A3420]/10",
    chromeHover: "hover:bg-[#4A3420]/10",
    track: "bg-[#4A3420]/15",
    selection: "selection:bg-[#E5BE8F]",
    swatch: "bg-[#F1E3C6] text-[#4A3420]",
    dark: false,
  },
  linen: {
    page: "bg-[#ECEAE4] text-[#2A2A2A]",
    muted: "text-[#77746C]",
    chrome: "bg-[#F6F5F1]/95 text-[#2A2A2A] shadow-lg shadow-black/10 ring-1 ring-black/5",
    chromeHover: "hover:bg-black/5",
    track: "bg-black/10",
    selection: "selection:bg-[#D9D2C0]",
    swatch: "bg-[#ECEAE4] text-[#2A2A2A]",
    dark: false,
  },
  sage: {
    page: "bg-[#E2E9DF] text-[#22302A]",
    muted: "text-[#5F6F64]",
    chrome: "bg-[#EDF2EA]/95 text-[#22302A] shadow-lg shadow-[#22302A]/10 ring-1 ring-[#22302A]/10",
    chromeHover: "hover:bg-[#22302A]/10",
    track: "bg-[#22302A]/15",
    selection: "selection:bg-[#C3D6B8]",
    swatch: "bg-[#E2E9DF] text-[#22302A]",
    dark: false,
  },
  contrast: {
    page: "bg-white text-black",
    muted: "text-[#444444]",
    chrome: "bg-white text-black shadow-lg shadow-black/20 ring-1 ring-black/40",
    chromeHover: "hover:bg-black/10",
    track: "bg-black/20",
    selection: "selection:bg-[#FFE066]",
    swatch: "bg-white text-black",
    dark: false,
  },
  twilight: {
    page: "bg-[#2B2119] text-[#EBC795]",
    muted: "text-[#A88B66]",
    chrome: "bg-[#3A2D22]/95 text-[#EBC795] shadow-lg shadow-black/40 ring-1 ring-[#EBC795]/15",
    chromeHover: "hover:bg-[#EBC795]/10",
    track: "bg-[#EBC795]/20",
    selection: "selection:bg-[#5A3E25]",
    swatch: "bg-[#2B2119] text-[#EBC795]",
    dark: true,
  },
  dark: {
    page: "bg-[#1F1E24] text-[#DAD5CA]",
    muted: "text-[#8D8880]",
    chrome: "bg-[#2A2930]/95 text-[#DAD5CA] shadow-lg shadow-black/40 ring-1 ring-white/10",
    chromeHover: "hover:bg-white/10",
    track: "bg-white/15",
    selection: "selection:bg-[#4A3A3A]",
    swatch: "bg-[#1F1E24] text-[#DAD5CA]",
    dark: true,
  },
  ocean: {
    page: "bg-[#1B2633] text-[#D5DEE8]",
    muted: "text-[#8494A6]",
    chrome: "bg-[#243244]/95 text-[#D5DEE8] shadow-lg shadow-black/40 ring-1 ring-white/10",
    chromeHover: "hover:bg-white/10",
    track: "bg-white/15",
    selection: "selection:bg-[#2F4A63]",
    swatch: "bg-[#1B2633] text-[#D5DEE8]",
    dark: true,
  },
  black: {
    page: "bg-black text-[#B9B3A6]",
    muted: "text-[#77716A]",
    chrome: "bg-[#141414]/95 text-[#B9B3A6] shadow-lg shadow-black ring-1 ring-white/10",
    chromeHover: "hover:bg-white/10",
    track: "bg-white/15",
    selection: "selection:bg-[#3A2E2A]",
    swatch: "bg-black text-[#B9B3A6]",
    dark: true,
  },
};

/** Ordem do painel de aparência (3 × 3, como no design). */
export const THEME_ORDER: ReaderTheme[] = [
  "light",
  "sepia",
  "linen",
  "sage",
  "contrast",
  "twilight",
  "dark",
  "ocean",
  "black",
];

export const THEME_LABEL: Record<ReaderTheme, string> = {
  light: "Papel",
  sepia: "Sépia",
  linen: "Linho",
  sage: "Sálvia",
  contrast: "Contraste",
  twilight: "Crepúsculo",
  dark: "Noite",
  ocean: "Oceano",
  black: "Breu",
};

export const FONT_SIZE_CLASSES: Record<FontSizeStep, string> = {
  1: "text-sm",
  2: "text-base",
  3: "text-lg",
  4: "text-xl",
  5: "text-2xl",
  6: "text-3xl",
  7: "text-4xl",
};

export const ALIGN_CLASSES: Record<ReaderTextAlign, string> = {
  left: "text-left",
  justify: "text-justify hyphens-auto",
};

export const FONT_CLASSES: Record<ReaderFont, string> = {
  serif: "font-serif",
  sans: "font-sans",
};

export const LEADING_CLASSES: Record<ReaderLeading, string> = {
  normal: "leading-normal",
  relaxed: "leading-relaxed",
  loose: "leading-loose",
};

export const FONT_LABEL: Record<ReaderFont, string> = {
  serif: "Garamond",
  sans: "Montserrat",
};

export const ALIGN_LABEL: Record<ReaderTextAlign, string> = {
  left: "Esquerda",
  justify: "Justificado",
};

export const LEADING_LABEL: Record<ReaderLeading, string> = {
  normal: "Compacto",
  relaxed: "Normal",
  loose: "Amplo",
};

/**
 * Títulos do livro, em `em` para acompanhar o tamanho de fonte escolhido, na
 * fonte de títulos (Cormorant). Nível 1 (capítulo, índice) começa numa página
 * nova, como num livro impresso; nenhum título fica sozinho no pé da página.
 */
export const HEADING_CLASSES: Record<1 | 2 | 3, string> = {
  1: "break-before-column first:break-before-auto mt-[1.2em] mb-[0.9em] font-display text-[2em] leading-[1.1] font-semibold hyphens-none break-after-avoid first:mt-0",
  2: "mt-[1.2em] mb-[0.6em] font-display text-[1.45em] leading-snug font-semibold hyphens-none break-after-avoid",
  3: "mt-[1em] mb-[0.4em] font-display text-[1.2em] leading-snug font-semibold hyphens-none break-after-avoid",
};

/** Classes do bloco de texto do leitor. */
export function readerTextClasses(s: ReaderSettings): string {
  return [
    FONT_SIZE_CLASSES[s.fontSize],
    ALIGN_CLASSES[s.textAlign],
    FONT_CLASSES[s.fontFamily],
    LEADING_CLASSES[s.lineHeight],
    THEME_CLASSES[s.theme].selection,
  ].join(" ");
}
