"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Tag } from "lucide-react";
import { Modal, modalPrimaryButton, modalSecondaryButton } from "@/components/ui/Modal";
import { findCategory, normalizeCategories } from "@/lib/books/categories";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/types/book";
import { CategoryPicker } from "./CategoryPicker";

interface BookCategoriesProps {
  book: Pick<Book, "id" | "title"> & { categories?: string[] };
}

/** Categorias na página do livro: cada uma leva à galeria filtrada; o botão abre o seletor. */
export function BookCategories({ book }: BookCategoriesProps) {
  const router = useRouter();
  const current = normalizeCategories(book.categories ?? []);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    const { error } = await createClient()
      .from("books")
      .update({ categories: normalizeCategories(draft) })
      .eq("id", book.id);
    setPending(false);

    if (error) {
      return setError(
        error.code === "42703"
          ? "O banco ainda não aceita categorias: rode o SQL das categorias no Supabase."
          : "Não foi possível salvar. Tente de novo.",
      );
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {current.map((slug) => (
        <Link
          key={slug}
          href={`/?categoria=${slug}`}
          className="flex items-center gap-1.5 rounded-full bg-coral-soft px-3.5 py-1 text-sm font-medium text-coral-dark hover:ring-1 hover:ring-coral/40"
        >
          <Tag className="size-3.5" aria-hidden />
          {findCategory(slug)?.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={() => {
          setDraft(current);
          setError(null);
          setOpen(true);
        }}
        className="flex items-center gap-1 rounded-full px-3.5 py-1 text-sm font-semibold text-coral-dark ring-1 ring-coral/30 hover:bg-white"
      >
        {current.length === 0 && <Plus className="size-3.5" aria-hidden />}
        {current.length === 0 ? "Categorias" : "Editar"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="categorias-titulo" dismissible={!pending} wide>
        <p className="truncate text-xs font-semibold tracking-widest text-coral-dark uppercase">{book.title}</p>
        <h2 id="categorias-titulo" className="mb-3 font-display text-3xl font-semibold">
          Categorias do livro
        </h2>
        <CategoryPicker value={draft} onChange={setDraft} disabled={pending} />
        {error && <p className="mt-4 text-sm text-coral-dark">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} disabled={pending} className={modalSecondaryButton}>
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={pending} className={modalPrimaryButton}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Salvar
          </button>
        </div>
      </Modal>
    </div>
  );
}
