"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Modal, modalSecondaryButton } from "@/components/ui/Modal";
import { deleteBook } from "@/lib/books/delete";
import type { Book } from "@/types/book";

interface DeleteBookButtonProps {
  book: Pick<Book, "id" | "title" | "pdf_path" | "cover_path" | "content_path">;
  className?: string;
}

/** Botão de apagar com confirmação. */
export function DeleteBookButton({ book, className = "" }: DeleteBookButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteBook(book);
      setOpen(false);
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
        onClick={() => setOpen(true)}
        title="Apagar livro"
        aria-label="Apagar livro"
        className={className}
      >
        <Trash2 className="size-[1.15rem]" aria-hidden />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="apagar-titulo" dismissible={!pending}>
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
          <button type="button" onClick={() => setOpen(false)} disabled={pending} className={modalSecondaryButton}>
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
      </Modal>
    </>
  );
}
