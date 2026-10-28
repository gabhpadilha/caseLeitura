"use client";

import type { ReactNode } from "react";
import {
  ALIGN_LABEL,
  FONT_LABEL,
  LEADING_LABEL,
  THEME_CLASSES,
  THEME_LABEL,
  THEME_ORDER,
  type ThemeClasses,
} from "@/lib/reader/styles";
import type { FontSizeStep, ReaderSettings } from "@/types/reader";

interface ReaderSettingsPanelProps {
  settings: ReaderSettings;
  onChange: (next: ReaderSettings) => void;
  theme: ThemeClasses;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Record<T, string>;
  onSelect: (value: T) => void;
  hover: string;
  dark: boolean;
  /** Classe de fonte por opção (ex.: mostrar "Garamond" em Garamond). */
  fontOf?: (value: T) => string;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onSelect,
  hover,
  dark,
  fontOf,
}: SegmentedProps<T>) {
  const active = dark ? "bg-[#F3EEE3] text-[#24232B]" : "bg-ink text-paper";
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {(Object.keys(options) as T[]).map((option) => (
        <button
          key={option}
          role="radio"
          aria-checked={value === option}
          onClick={() => onSelect(option)}
          className={`flex-1 rounded-full px-3 py-2 text-sm ring-1 ring-current/15 transition-colors ${fontOf?.(option) ?? ""} ${
            value === option ? `${active} ring-transparent` : hover
          }`}
        >
          {options[option]}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase opacity-60">{label}</span>
      {children}
    </div>
  );
}

export function ReaderSettingsPanel({ settings, onChange, theme }: ReaderSettingsPanelProps) {
  const set = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) =>
    onChange({ ...settings, [key]: value });
  const stepButton = `flex size-10 shrink-0 items-center justify-center rounded-full font-display text-lg ring-1 ring-current/15 disabled:opacity-30 ${theme.chromeHover}`;

  return (
    <section
      aria-label="Aparência"
      className={`flex max-h-[min(72dvh,40rem)] w-[min(23rem,100%)] flex-col gap-5 overflow-y-auto rounded-3xl p-5 backdrop-blur ${theme.chrome}`}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <header className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold">Aparência</h2>
        <span className="text-sm font-semibold">{THEME_LABEL[settings.theme]}</span>
      </header>

      <Row label="Tema">
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2.5">
          {THEME_ORDER.map((t) => (
            <button
              key={t}
              role="radio"
              aria-checked={settings.theme === t}
              onClick={() => set("theme", t)}
              className="flex flex-col items-center gap-1.5 text-xs"
            >
              <span
                className={`flex h-12 w-full items-center justify-center rounded-xl font-display text-xl ring-1 ring-black/10 ${THEME_CLASSES[t].swatch} ${
                  settings.theme === t ? "outline-2 outline-offset-2 outline-coral" : ""
                }`}
              >
                Aa
              </span>
              {THEME_LABEL[t]}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Tamanho do texto">
        <div className="flex items-center gap-3">
          <button
            className={stepButton}
            onClick={() => set("fontSize", Math.max(1, settings.fontSize - 1) as FontSizeStep)}
            disabled={settings.fontSize === 1}
            aria-label="Diminuir fonte"
          >
            A−
          </button>
          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={settings.fontSize}
            onChange={(e) => set("fontSize", Number(e.target.value) as FontSizeStep)}
            aria-label="Tamanho do texto"
            className="min-w-0 flex-1 accent-coral"
          />
          <button
            className={stepButton}
            onClick={() => set("fontSize", Math.min(7, settings.fontSize + 1) as FontSizeStep)}
            disabled={settings.fontSize === 7}
            aria-label="Aumentar fonte"
          >
            A+
          </button>
        </div>
      </Row>

      <Row label="Fonte">
        <Segmented
          label="Fonte"
          value={settings.fontFamily}
          options={FONT_LABEL}
          onSelect={(v) => set("fontFamily", v)}
          hover={theme.chromeHover}
          dark={theme.dark}
          fontOf={(v) => (v === "serif" ? "font-serif text-base" : "font-sans")}
        />
      </Row>

      <Row label="Alinhamento">
        <Segmented
          label="Alinhamento"
          value={settings.textAlign}
          options={ALIGN_LABEL}
          onSelect={(v) => set("textAlign", v)}
          hover={theme.chromeHover}
          dark={theme.dark}
        />
      </Row>

      <Row label="Espaçamento">
        <Segmented
          label="Espaçamento entre linhas"
          value={settings.lineHeight}
          options={LEADING_LABEL}
          onSelect={(v) => set("lineHeight", v)}
          hover={theme.chromeHover}
          dark={theme.dark}
        />
      </Row>
    </section>
  );
}
