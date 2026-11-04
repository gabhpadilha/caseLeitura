"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getPtVoicesSnapshot,
  getServerVoicesSnapshot,
  subscribeVoices,
  type SpeechChunk,
} from "@/lib/reader/speech";

export type SpeechStatus = "idle" | "playing" | "paused";

interface UseSpeechOptions {
  chunks: SpeechChunk[];
  /** Chamado quando um trecho começa a ser lido. */
  onChunk: (chunk: SpeechChunk) => void;
}

const RATE_KEY = "minhas-leituras:audio-rate";
const VOICE_KEY = "minhas-leituras:audio-voice";

const noopSubscribe = () => () => {};
const detectSupport = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Armazenamento bloqueado: a preferência vale só nesta sessão.
  }
}

function initialRate() {
  const n = Number(readStored(RATE_KEY));
  return n >= 0.5 && n <= 3 ? n : 1;
}

/**
 * Audiolivro com a Web Speech API (gratuita, no próprio navegador).
 * Lê um trecho curto por vez; ao terminar um, começa o próximo. "Pausar" cancela
 * a fala e guarda o trecho: retomar o repete do começo, o que funciona igual em
 * todos os navegadores (pause()/resume() nativos são instáveis no Android).
 */
export function useSpeech({ chunks, onChunk }: UseSpeechOptions) {
  const supported = useSyncExternalStore(noopSubscribe, detectSupport, () => false);
  const voices = useSyncExternalStore(
    supported ? subscribeVoices : noopSubscribe,
    supported ? getPtVoicesSnapshot : getServerVoicesSnapshot,
    getServerVoicesSnapshot,
  );

  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rate, setRateState] = useState(initialRate);
  const [storedVoice, setStoredVoice] = useState(() => readStored(VOICE_KEY));

  // Voz escolhida, se ainda existir; senão a melhor pt-BR (a lista vem ordenada).
  const voice = voices.find((v) => v.voiceURI === storedVoice) ?? voices[0] ?? null;

  // O callback de fim da fala precisa dos valores mais recentes, não dos do render que o criou.
  const live = useRef({ chunks, onChunk, rate, voice });
  useEffect(() => {
    live.current = { chunks, onChunk, rate, voice };
  });

  const token = useRef(0); // invalida eventos de falas já canceladas
  const index = useRef(0);
  // O Chrome pode descartar o utterance antes do fim se nada o referenciar.
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const speakRef = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    speakRef.current = (i: number) => {
      const synth = window.speechSynthesis;
      const mine = ++token.current;
      synth.cancel();
      const { chunks: list, onChunk: notify, rate: speed, voice: v } = live.current;
      if (i >= list.length) {
        utterance.current = null;
        setStatus("idle");
        return;
      }
      index.current = i;
      notify(list[i]);
      const u = new SpeechSynthesisUtterance(list[i].text);
      u.lang = v?.lang ?? "pt-BR";
      if (v) u.voice = v;
      u.rate = speed;
      u.onend = () => {
        if (mine === token.current) speakRef.current(i + 1);
      };
      u.onerror = (e) => {
        // cancel() dispara "canceled"/"interrupted": é a nossa própria troca de trecho.
        if (mine !== token.current || e.error === "canceled" || e.error === "interrupted") return;
        setError("Não foi possível reproduzir o áudio. Verifique o volume do aparelho e tente de novo.");
        setStatus("idle");
      };
      utterance.current = u;
      synth.speak(u);
    };
  });

  const cancel = useCallback(() => {
    token.current++;
    utterance.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const play = useCallback((from: number) => {
    setError(null);
    setStatus("playing");
    speakRef.current(from);
  }, []);

  const pause = useCallback(() => {
    cancel();
    setStatus("paused");
  }, [cancel]);

  const resume = useCallback(() => play(index.current), [play]);

  const stop = useCallback(() => {
    cancel();
    setStatus("idle");
  }, [cancel]);

  // Troca de velocidade ou voz com o áudio tocando: repete o trecho atual com o novo valor.
  const restartIfPlaying = useCallback(() => {
    if (status === "playing") queueMicrotask(() => speakRef.current(index.current));
  }, [status]);

  const setRate = (next: number) => {
    live.current.rate = next;
    setRateState(next);
    writeStored(RATE_KEY, String(next));
    restartIfPlaying();
  };

  const setVoice = (uri: string) => {
    live.current.voice = voices.find((v) => v.voiceURI === uri) ?? live.current.voice;
    setStoredVoice(uri);
    writeStored(VOICE_KEY, uri);
    restartIfPlaying();
  };

  // Sair do leitor (desmontagem, Voltar, fechar a aba) interrompe a fala.
  useEffect(() => {
    window.addEventListener("pagehide", cancel);
    return () => {
      window.removeEventListener("pagehide", cancel);
      cancel();
    };
  }, [cancel]);

  // Texto trocado (recarregado) com áudio ativo: o índice não vale mais.
  useEffect(() => {
    return () => {
      if (chunks.length) stop();
    };
  }, [chunks, stop]);

  return { supported, status, error, voices, voice, rate, play, pause, resume, stop, setRate, setVoice };
}
