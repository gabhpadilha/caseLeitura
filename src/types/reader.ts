import type { Enums, Tables } from "./database";

export type ReaderTheme = Enums<"reader_theme">;
export type ReaderTextAlign = Enums<"reader_text_align">;
export type ReaderFont = Enums<"reader_font">;
export type ReaderLeading = Enums<"reader_leading">;

/** Degraus da escala tipográfica (constraint `font_size between 1 and 7`). */
export type FontSizeStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Preferências do leitor como a UI as consome (sem metadados do banco). */
export interface ReaderSettings {
  theme: ReaderTheme;
  fontSize: FontSizeStep;
  textAlign: ReaderTextAlign;
  fontFamily: ReaderFont;
  lineHeight: ReaderLeading;
}

export type ReadingPreferencesRow = Tables<"reading_preferences">;

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: "light",
  fontSize: 3,
  textAlign: "justify",
  fontFamily: "serif",
  lineHeight: "relaxed",
};

function toFontSizeStep(n: number): FontSizeStep {
  return Math.min(7, Math.max(1, Math.round(n))) as FontSizeStep;
}

export function settingsFromRow(row: ReadingPreferencesRow | null): ReaderSettings {
  if (!row) return DEFAULT_READER_SETTINGS;
  return {
    theme: row.theme,
    fontSize: toFontSizeStep(row.font_size),
    textAlign: row.text_align,
    fontFamily: row.font_family,
    lineHeight: row.line_height,
  };
}

export function settingsToRow(
  s: ReaderSettings,
): Omit<ReadingPreferencesRow, "user_id" | "updated_at"> {
  return {
    theme: s.theme,
    font_size: s.fontSize,
    text_align: s.textAlign,
    font_family: s.fontFamily,
    line_height: s.lineHeight,
  };
}
