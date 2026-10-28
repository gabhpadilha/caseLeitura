"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteBook } from "@/lib/books/delete";
import type { Book } from "@/types/book";

interface DeleteBookButtonProps {
  book: Pick<Book, "id" | "title" | "pdf_path" | "cover_path" | "content_path">;
  className?: string;
}

/** Botão de apagar com confirmação num <dialog> nativo (foco preso e Esc fecham). */
export function DeleteBookButton({ book, className = "" }: DeleteBookButtonProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteBook(book);
      dialogRef.current?.close();
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        title="Apagar livro"
        aria-label="Apagar livro"
        className={className}
      >
        <Trash2 className="size-[1.15rem]" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="apagar-titulo"
        // Clique no fundo escurecido fecha (o alvo é o próprio <dialog>).
        onClick={(e) => e.target === dialogRef.current && !pending && dialogRef.current?.close()}
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-3xl bg-paper-soft p-0 text-ink shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-6 sm:p-7">
          <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral-dark">
              <Trash2 className="size-5" aria-hidden />
            </span>
            <div>
              <h2 id="apagar-titulo" className="font-display text-2xl leading-tight font-semibold">
                Apagar “{book.title}”?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-graphite">
                O PDF, o texto, a capa, o progresso, a resenha e as anotações serão removidos. Não dá
                para desfazer.
              </p>
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-coral-dark">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
              className="rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/20 hover:bg-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-coral-dark px-5 py-2.5 text-sm font-medium text-white hover:bg-coral-dark/90 disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Apagar livro
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
