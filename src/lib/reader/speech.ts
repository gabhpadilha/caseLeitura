import type { TextBlock } from "./blocks";

/** Trecho curto de um bloco do livro, no tamanho que o speechSynthesis lê com segurança. */
export interface SpeechChunk {
  /** Índice do bloco (parágrafo/título) em `parseBlocks`, usado para destacar e rolar. */
  block: number;
  text: string;
}

/**
 * O Chrome interrompe falas longas (~15 s); trechos curtos evitam o corte e
 * permitem retomar de um ponto no meio do parágrafo.
 */
const MAX_CHUNK_CHARS = 220;

const SENTENCE = /[^.!?…]+[.!?…]+["”')\]]*\s*|[^.!?…]+$/g;

/** Divide o texto em frases e junta as vizinhas até o limite; frases enormes quebram no espaço. */
function splitText(text: string): string[] {
  const sentences = text.match(SENTENCE) ?? [text];
  const parts: string[] = [];
  let current = "";
  const flush = () => {
    if (current.trim()) parts.push(current.trim());
    current = "";
  };
  for (let sentence of sentences) {
    while (sentence.length > MAX_CHUNK_CHARS) {
      const cut = sentence.lastIndexOf(" ", MAX_CHUNK_CHARS);
      const at = cut > 0 ? cut : MAX_CHUNK_CHARS;
      flush();
      parts.push(sentence.slice(0, at).trim());
      sentence = sentence.slice(at);
    }
    if (current.length + sentence.length > MAX_CHUNK_CHARS) flush();
    current += sentence;
  }
  flush();
  return parts;
}

/** Trechos de leitura em ordem; ilustrações não têm fala. */
export function buildSpeechChunks(blocks: TextBlock[]): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];
  blocks.forEach((block, i) => {
    if (block.kind === "image") return;
    for (const text of splitText(block.text)) chunks.push({ block: i, text });
  });
  return chunks;
}

// ---- Vozes -----------------------------------------------------------------

const EMPTY_VOICES: SpeechSynthesisVoice[] = [];
let voicesCache = EMPTY_VOICES;
let voicesKey = "";

function langOf(voice: SpeechSynthesisVoice) {
  return voice.lang.replace("_", "-").toLowerCase(); // Android usa "pt_BR"
}

/** Qualidade presumida: vozes neurais/online soam melhor que as embutidas. */
function score(voice: SpeechSynthesisVoice) {
  let s = 0;
  if (/natural|neural|online/i.test(voice.name)) s += 3;
  if (/google/i.test(voice.name)) s += 2;
  if (langOf(voice) === "pt-br") s += 1;
  return s;
}

/** Vozes pt-BR (ou, na falta delas, qualquer português), da melhor para a pior. */
export function selectPtVoices(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const br = all.filter((v) => langOf(v) === "pt-br");
  const pool = br.length > 0 ? br : all.filter((v) => langOf(v).startsWith("pt"));
  return [...pool].sort((a, b) => score(b) - score(a));
}

/** Snapshot estável (mesma referência enquanto a lista não muda) para useSyncExternalStore. */
export function getPtVoicesSnapshot(): SpeechSynthesisVoice[] {
  const all = window.speechSynthesis.getVoices();
  const key = all.map((v) => v.voiceURI).join("|");
  if (key !== voicesKey) {
    voicesKey = key;
    voicesCache = selectPtVoices(all);
  }
  return voicesCache;
}

export function getServerVoicesSnapshot() {
  return EMPTY_VOICES;
}

/** As vozes carregam de forma assíncrona: o navegador avisa com `voiceschanged`. */
export function subscribeVoices(onChange: () => void) {
  const synth = window.speechSynthesis;
  synth.addEventListener("voiceschanged", onChange);
  return () => synth.removeEventListener("voiceschanged", onChange);
}

export const SPEECH_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
