"use client";

import { Pause, Play, Square, X } from "lucide-react";
import { SPEECH_RATES } from "@/lib/reader/speech";
import type { ThemeClasses } from "@/lib/reader/styles";
import type { SpeechStatus } from "./use-speech";

interface ReaderAudioPlayerProps {
  theme: ThemeClasses;
  status: SpeechStatus;
  error: string | null;
  voices: SpeechSynthesisVoice[];
  voiceUri: string | null;
  rate: number;
  onPlayPause: () => void;
  onStop: () => void;
  onClose: () => void;
  onRate: (rate: number) => void;
  onVoice: (voiceUri: string) => void;
}

function rateLabel(rate: number) {
  return `${String(rate).replace(".", ",")}x`;
}

export function ReaderAudioPlayer({
  theme,
  status,
  error,
  voices,
  voiceUri,
  rate,
  onPlayPause,
  onStop,
  onClose,
  onRate,
  onVoice,
}: ReaderAudioPlayerProps) {
  const playing = status === "playing";
  const round = `flex size-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${theme.chromeHover}`;
  const select = `min-w-0 rounded-full border border-current/20 bg-transparent px-3 py-2 text-sm [&>option]:bg-white [&>option]:text-black`;

  return (
    <section
      aria-label="Player de áudio"
      className={`flex w-[min(23rem,100%)] flex-col gap-3 rounded-3xl p-3 backdrop-blur ${theme.chrome}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPlayPause}
          aria-label={playing ? "Pausar leitura em voz alta" : "Ouvir a partir daqui"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-coral text-white shadow-md shadow-coral/30 transition-colors hover:bg-coral-dark"
        >
          {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={status === "idle"}
          aria-label="Parar leitura em voz alta"
          className={round}
        >
          <Square className="size-[1.1rem]" aria-hidden />
        </button>

        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="sr-only sm:not-sr-only">Velocidade</span>
          <select
            value={rate}
            onChange={(e) => onRate(Number(e.target.value))}
            aria-label="Velocidade da leitura"
            className={select}
          >
            {SPEECH_RATES.map((r) => (
              <option key={r} value={r}>
                {rateLabel(r)}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={onClose} aria-label="Fechar player de áudio" className={round}>
          <X className="size-[1.1rem]" aria-hidden />
        </button>
      </div>

      {voices.length > 0 ? (
        <select
          value={voiceUri ?? ""}
          onChange={(e) => onVoice(e.target.value)}
          aria-label="Voz da leitura"
          className={`${select} w-full`}
        >
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang.replace("_", "-")})
            </option>
          ))}
        </select>
      ) : (
        <p className={`px-1 text-xs ${theme.muted}`}>
          Nenhuma voz em português encontrada. O navegador usará a voz padrão do aparelho.
        </p>
      )}

      {error && (
        <p role="alert" className="px-1 text-xs font-medium">
          {error}
        </p>
      )}
      <p className={`px-1 text-xs ${theme.muted}`}>
        Toque num parágrafo para continuar dali. No iPhone, o áudio pode parar com a tela bloqueada.
      </p>
    </section>
  );
}
