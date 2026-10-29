"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { Modal, modalField, modalPrimaryButton, modalSecondaryButton } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/types/book";

interface EditBookButtonProps {
  book: Pick<Book, "id" | "title" | "author" | "description">;
  className?: string;
}

// Limites das constraints do banco (books.title 1–300, books.author ≤ 200).
const TITLE_MAX = 300;
const AUTHOR_MAX = 200;

/** Editar título, autor e descrição do livro. */
export function EditBookButton({ book, className = "" }: EditBookButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const author = String(form.get("author") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    if (!title) return setError("O título não pode ficar vazio.");

    setPending(true);
    setError(null);
    const { error } = await createClient()
      .from("books")
      .update({ title, author: author || null, description: description || null })
      .eq("id", book.id);
    setPending(false);

    if (error) return setError("Não foi possível salvar. Tente de novo.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        title="Editar informações"
        aria-label="Editar informações do livro"
        className={className}
      >
        <Pencil className="size-[1.15rem]" aria-hidden />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="editar-titulo" dismissible={!pending}>
        {/* key: reabrir mostra os valores atuais (após router.refresh). */}
        <form key={`${open}`} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 id="editar-titulo" className="font-display text-3xl font-semibold">
            Informações do livro
          </h2>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Título
            <input name="title" required maxLength={TITLE_MAX} defaultValue={book.title} className={modalField} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Autor
            <input
              name="author"
              maxLength={AUTHOR_MAX}
              defaultValue={book.author ?? ""}
              placeholder="Machado de Assis"
              className={modalField}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            <span>
              Descrição <span className="font-normal text-graphite">(opcional)</span>
            </span>
            <textarea
              name="description"
              rows={3}
              defaultValue={book.description ?? ""}
              placeholder="Uma frase para lembrar do que se trata."
              className={`${modalField} resize-y`}
            />
          </label>
          {error && <p className="text-sm text-coral-dark">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className={modalSecondaryButton}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} className={modalPrimaryButton}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
