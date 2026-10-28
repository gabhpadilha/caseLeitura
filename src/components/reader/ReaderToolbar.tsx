"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, LibraryBig, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { THEME_LABEL, type ThemeClasses } from "@/lib/reader/styles";
import type { ReaderTheme } from "@/types/reader";

interface ReaderToolbarProps {
  theme: ThemeClasses;
  currentTheme: ReaderTheme;
  page: number;
  pageCount: number;
  disabled: boolean;
  settingsOpen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (page: number) => void;
  onCycleTheme: () => void;
  onToggleSettings: () => void;
}


export function ReaderToolbar({
  theme,
  currentTheme,
  page,
  pageCount,
  disabled,
  settingsOpen,
  onPrev,
  onNext,
  onSeek,
  onCycleTheme,
  onToggleSettings,
}: ReaderToolbarProps) {
  const button = `flex size-10 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${theme.chromeHover}`;
  // Alternador rápido claro/escuro; os nove temas ficam no painel Aparência.
  const ThemeIcon = theme.dark ? Sun : Moon;

  return (
    <nav
      aria-label="Controles de leitura"
      className={`flex max-w-full items-center gap-1 rounded-full p-1.5 backdrop-blur ${theme.chrome}`}
    >
      <Link href="/" className={button} aria-label="Voltar à biblioteca">
        <LibraryBig className="size-[1.15rem]" aria-hidden />
      </Link>

      <span className="mx-1 h-6 w-px bg-current opacity-15" aria-hidden />

      <button className={button} onClick={onPrev} disabled={disabled || page === 0} aria-label="Página anterior">
        <ChevronLeft className="size-5" aria-hidden />
      </button>

      <input
        type="range"
        min={1}
        max={pageCount}
        value={page + 1}
        disabled={disabled || pageCount < 2}
        onChange={(e) => onSeek(Number(e.target.value) - 1)}
        aria-label="Ir para a página"
        className="hidden w-32 accent-coral sm:block md:w-48"
      />

      <span className="min-w-[4.5rem] px-1 text-center text-sm tabular-nums">
        {page + 1} <span className="opacity-50">/ {pageCount}</span>
      </span>

      <button
        className={button}
        onClick={onNext}
        disabled={disabled || page >= pageCount - 1}
        aria-label="Próxima página"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>

      <span className="mx-1 h-6 w-px bg-current opacity-15" aria-hidden />

      <button
        className={button}
        onClick={onCycleTheme}
        aria-label={`Tema ${THEME_LABEL[currentTheme]}. ${theme.dark ? "Mudar para Papel" : "Mudar para Noite"}`}
      >
        <ThemeIcon className="size-[1.15rem]" aria-hidden />
      </button>

      <button
        onClick={onToggleSettings}
        aria-expanded={settingsOpen}
        aria-label="Ajustes de leitura"
        className={`flex size-11 items-center justify-center rounded-full transition-colors ${
          settingsOpen ? "bg-coral text-white shadow-md shadow-coral/30" : theme.chromeHover
        }`}
      >
        <SlidersHorizontal className="size-[1.15rem]" aria-hidden />
      </button>
    </nav>
  );
}
