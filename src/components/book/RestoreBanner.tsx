"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Upload } from "lucide-react";
import { Modal, modalPrimaryButton, modalSecondaryButton } from "@/components/ui/Modal";
import { restoreBook, type PageMismatch } from "@/lib/books/archive";
import { formatDate } from "@/lib/books/format";
import { formatBytes, getBookSizes } from "@/lib/books/quota";
import { progressLabel } from "@/lib/pdf/extract";
import type { Book } from "@/types/book";

interface RestoreBannerProps {
  book: Pick<Book, "id" | "kind" | "pdf_path" | "page_count" | "archive_level" | "archived_at">;
}

const STAGE_LABEL = { reading: "Lendo o arquivo…", uploading: "Enviando…", saving: "Salvando…" } as const;

/** Faixa no topo do livro arquivado: explica o que foi arquivado e restaura a partir de um arquivo. */
export function RestoreBanner({ book }: RestoreBannerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [mismatch, setMismatch] = useState<(PageMismatch & { answer: (ok: boolean) => void }) | null>(null);

  const full = book.archive_level === "full";
  const ext = book.pdf_path.split(".").pop()?.toUpperCase() ?? "PDF";
  const archivedAt = formatDate(book.archived_at);

  // Quanto o livro ainda ocupa (capa e ficha): consultado depois que a página carrega.
  useEffect(() => {
    let cancelled = false;
    getBookSizes().then((sizes) => {
      const mine = sizes.find((s) => s.bookId === book.id);
      if (!cancelled && mine) setSize(mine.bytes);
    });
    return () => {
      cancelled = true;
    };
  }, [book.id]);

  async function handleFile(file: File) {
    setError(null);
    setProgress(STAGE_LABEL.reading);
    try {
      await restoreBook(book, file, {
        onStage: (stage) => setProgress(STAGE_LABEL[stage]),
        onExtractProgress: (p) => {
          const label = progressLabel(p);
          setProgress(`${label.charAt(0).toUpperCase()}${label.slice(1)}…`);
        },
        confirmPageMismatch: (info) => new Promise((resolve) => setMismatch({ ...info, answer: resolve })),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      setProgress(null);
    }
  }

  function answer(ok: boolean) {
    mismatch?.answer(ok);
    setMismatch(null);
  }

  return (
    <section
      aria-labelledby="arquivado-titulo"
      className="mb-8 flex flex-col gap-3 rounded-2xl bg-paper-soft p-5 text-sm ring-1 ring-ink/10 sm:flex-row sm:items-center"
    >
      <Archive className="hidden size-6 shrink-0 text-graphite sm:block" aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 id="arquivado-titulo" className="font-semibold">
          Arquivado{archivedAt ? ` em ${archivedAt}` : ""}
          {size !== null && ` · hoje ocupa só ${formatBytes(size)}`}
        </h2>
        <p className="mt-0.5 leading-relaxed text-graphite">
          {full
            ? `O texto e o arquivo foram apagados para liberar espaço. Para ler de novo, escolha o ${ext} outra vez; progresso, status e resenha continuam aqui.`
            : `O arquivo original foi apagado, mas o livro continua legível. Para baixá-lo ou reprocessar o texto, escolha o ${ext} outra vez.`}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-coral-dark">
            {error}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ext === "CBZ" ? ".cbz,application/zip" : ".pdf,application/pdf"}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        aria-live="polite"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 font-medium text-paper hover:bg-ink/85 disabled:opacity-60"
      >
        {progress ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
        {progress ?? "Restaurar"}
      </button>

      <Modal open={mismatch !== null} onClose={() => answer(false)} labelledBy="restaurar-paginas-titulo">
        <h2 id="restaurar-paginas-titulo" className="font-display text-2xl leading-tight font-semibold">
          Este parece ser outro arquivo
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          O livro tinha {mismatch?.expected} páginas e este PDF tem {mismatch?.found}. Se for outra edição do mesmo
          livro, pode continuar; o texto e o ponto de leitura podem ficar um pouco desencontrados.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => answer(false)} className={modalSecondaryButton}>
            Escolher outro arquivo
          </button>
          <button type="button" onClick={() => answer(true)} className={modalPrimaryButton}>
            Restaurar mesmo assim
          </button>
        </div>
      </Modal>
    </section>
  );
}
