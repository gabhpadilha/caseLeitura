"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, CircleCheck, FileUp, Loader2, MessageCircleMore, type LucideIcon } from "lucide-react";
import { uploadBook, type UploadStage } from "@/lib/books/upload";
import { uploadComic, type ComicStage } from "@/lib/comics/upload";
import { progressLabel } from "@/lib/pdf/extract";
import type { BookKind } from "@/types/book";

const STAGE_LABEL: Record<UploadStage | ComicStage, string> = {
  extracting: "Extraindo e limpando o texto",
  uploading: "Enviando arquivos",
  pages: "Preparando as páginas",
  saving: "Salvando na sua estante",
};

const KINDS: { kind: BookKind; label: string; hint: string; icon: LucideIcon }[] = [
  {
    kind: "book",
    label: "Livro",
    hint: "PDF. O texto é extraído e você lê com a sua fonte, tamanho e tema.",
    icon: BookOpen,
  },
  {
    kind: "comic",
    label: "Quadrinho",
    hint: "PDF ou CBZ. As páginas ficam como são, com desenhos e balões, e ganham o filtro de papel.",
    icon: MessageCircleMore,
  },
];

/** Se a navegação para o leitor não acontecer nesse tempo, mostra links diretos. */
const NAVIGATION_FALLBACK_MS = 4000;

export function UploadBookForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [kind, setKind] = useState<BookKind>(params.get("tipo") === "quadrinho" ? "comic" : "book");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage | ComicStage | null>(null);
  const [pageProgress, setPageProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [savedBookId, setSavedBookId] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // O livro já está salvo quando chega aqui: a tela nunca deve ficar presa.
  useEffect(() => {
    if (!savedBookId) return;
    const t = setTimeout(() => setShowFallback(true), NAVIGATION_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [savedBookId]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    const form = new FormData(e.currentTarget);
    setError(null);

    const input = {
      file,
      title: String(form.get("title") ?? ""),
      author: String(form.get("author") ?? ""),
    };
    try {
      const book =
        kind === "comic"
          ? await uploadComic(input, {
              onStage: setStage,
              onProgress: ({ page, totalPages }) => setPageProgress(`página ${page} de ${totalPages}`),
            })
          : await uploadBook(input, {
              onStage: setStage,
              onExtractProgress: (p) => setPageProgress(progressLabel(p)),
            });
      setSavedBookId(book.id);
      router.push(`/leitor/${book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
      setStage(null);
    }
  }

  const busy = stage !== null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">O que você vai guardar?</legend>
        {KINDS.map(({ kind: k, label, hint, icon: Icon }) => (
          <label
            key={k}
            className={`cursor-pointer rounded-[2rem] bg-paper-soft p-6 transition-shadow ${
              kind === k ? "ring-2 ring-coral" : "ring-1 ring-ink/5 hover:ring-ink/20"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={k}
              checked={kind === k}
              onChange={() => {
                setKind(k);
                setFile(null);
              }}
              className="sr-only"
            />
            <span
              className={`flex size-12 items-center justify-center rounded-full ${
                kind === k ? "bg-coral-soft text-coral-dark" : "bg-wood-soft text-graphite"
              }`}
            >
              <Icon className="size-6" strokeWidth={1.7} aria-hidden />
            </span>
            <span className="mt-4 block font-display text-3xl">{label}</span>
            <span className="mt-1 block text-sm leading-relaxed text-graphite">{hint}</span>
          </label>
        ))}
      </fieldset>

      <label className="flex cursor-pointer flex-col items-center gap-3 rounded-[2rem] border-2 border-dashed border-wood-dark/60 bg-paper-soft px-6 py-12 text-center hover:border-coral">
        <FileUp className="size-9 text-coral" strokeWidth={1.6} aria-hidden />
        <span className="text-sm font-medium">
          {file ? file.name : kind === "comic" ? "Escolha o arquivo do quadrinho (PDF ou CBZ)" : "Escolha um arquivo PDF"}
        </span>
        <input
          key={kind}
          type="file"
          accept={kind === "comic" ? "application/pdf,.cbz,application/zip,application/vnd.comicbook+zip" : "application/pdf"}
          className="sr-only"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <input
        name="title"
        placeholder={`Título (opcional — usamos o do ${kind === "comic" ? "arquivo" : "PDF"})`}
        disabled={busy}
        className="rounded-full bg-paper-soft px-5 py-3 text-sm ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-coral"
      />
      <input
        name="author"
        placeholder="Autor (opcional)"
        disabled={busy}
        className="rounded-full bg-paper-soft px-5 py-3 text-sm ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-coral"
      />

      {error && <p className="text-sm text-coral-dark">{error}</p>}

      {savedBookId && showFallback && (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-sage-soft p-5 text-sm text-[#2F5654]">
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Já está salvo na sua estante.</p>
            <p className="mt-1 text-[#2F5654]/80">O leitor está demorando para abrir.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/leitor/${savedBookId}`} className="rounded-full bg-ink px-4 py-1.5 font-medium text-paper">
                Abrir o leitor
              </Link>
              <Link href={`/livros/${savedBookId}`} className="rounded-full px-4 py-1.5 font-medium ring-1 ring-[#2F5654]/30">
                Ver a página
              </Link>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!file || busy}
        className="flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {savedBookId
          ? "Abrindo o leitor…"
          : busy
          ? `${STAGE_LABEL[stage]}${(stage === "extracting" || stage === "pages") && pageProgress ? ` (${pageProgress})` : ""}…`
          : "Adicionar à estante"}
      </button>
    </form>
  );
}
