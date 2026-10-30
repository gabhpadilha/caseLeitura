"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, FileUp, Loader2 } from "lucide-react";
import { uploadBook, type UploadStage } from "@/lib/books/upload";
import { progressLabel } from "@/lib/pdf/extract";

const STAGE_LABEL: Record<UploadStage, string> = {
  extracting: "Extraindo e limpando o texto",
  uploading: "Enviando arquivos",
  saving: "Salvando na sua estante",
};

/** Se a navegação para o leitor não acontecer nesse tempo, mostra links diretos. */
const NAVIGATION_FALLBACK_MS = 4000;

export function UploadBookForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage | null>(null);
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

    try {
      const book = await uploadBook(
        {
          file,
          title: String(form.get("title") ?? ""),
          author: String(form.get("author") ?? ""),
        },
        {
          onStage: setStage,
          onExtractProgress: (p) => setPageProgress(progressLabel(p)),
        },
      );
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
      <label className="flex cursor-pointer flex-col items-center gap-3 rounded-[2rem] border-2 border-dashed border-wood-dark/60 bg-paper-soft px-6 py-12 text-center hover:border-coral">
        <FileUp className="size-9 text-coral" strokeWidth={1.6} aria-hidden />
        <span className="text-sm font-medium">{file ? file.name : "Escolha um arquivo PDF"}</span>
        <input
          type="file"
          accept="application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <input
        name="title"
        placeholder="Título (opcional — usamos o do PDF)"
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
            <p className="font-medium">O livro já está salvo na sua estante.</p>
            <p className="mt-1 text-[#2F5654]/80">O leitor está demorando para abrir.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/leitor/${savedBookId}`} className="rounded-full bg-ink px-4 py-1.5 font-medium text-paper">
                Abrir o leitor
              </Link>
              <Link href={`/livros/${savedBookId}`} className="rounded-full px-4 py-1.5 font-medium ring-1 ring-[#2F5654]/30">
                Ver página do livro
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
          ? `${STAGE_LABEL[stage]}${stage === "extracting" && pageProgress ? ` (${pageProgress})` : ""}…`
          : "Adicionar à estante"}
      </button>
    </form>
  );
}
