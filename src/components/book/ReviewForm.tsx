"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, Loader2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Review } from "@/types/book";

interface ReviewFormProps {
  bookId: string;
  review: Review | null;
  /** Chamado depois de salvar (ex.: voltar ao modo de leitura). */
  onSaved?: () => void;
  /** Mostra "Cancelar" (modo de edição de uma resenha existente). */
  onCancel?: () => void;
}

const RATING_LABEL = ["Não gostei", "Mais ou menos", "Bom", "Muito bom", "Incrível"];

export function ReviewForm({ bookId, review, onSaved, onCancel }: ReviewFormProps) {
  const [saved, setSaved] = useState({ rating: review?.rating ?? null, content: review?.content ?? "" });
  const [rating, setRating] = useState<number | null>(saved.rating);
  const [content, setContent] = useState(saved.content);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  const dirty = rating !== saved.rating || content.trim() !== saved.content.trim();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const next = { rating, content: content.trim() };
      // Uma resenha por livro: o par (book_id, user_id) é único; user_id vem do auth.uid().
      const { error } = await createClient()
        .from("reviews")
        .upsert({ book_id: bookId, ...next }, { onConflict: "book_id,user_id" });
      if (error) return setStatus("error");
      setSaved(next);
      setContent(next.content);
      setStatus("saved");
      onSaved?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div role="radiogroup" aria-label="Nota" className="flex">
          {RATING_LABEL.map((label, i) => {
            const value = i + 1;
            const filled = rating !== null && value <= rating;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} de 5 — ${label}`}
                // Clicar na nota atual remove a nota.
                onClick={() => {
                  setRating(rating === value ? null : value);
                  setStatus("idle");
                }}
                className="p-1 text-coral transition-transform hover:scale-110"
              >
                <Star className={`size-6 ${filled ? "fill-coral" : "opacity-40"}`} strokeWidth={1.6} aria-hidden />
              </button>
            );
          })}
        </div>
        <span className="text-sm text-ink/60">{rating ? RATING_LABEL[rating - 1] : "Sem nota"}</span>
      </div>

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setStatus("idle");
        }}
        rows={6}
        placeholder="O que você achou? Personagens, trechos marcantes, o que ficou na cabeça…"
        aria-label="Resenha"
        className="w-full resize-y rounded-2xl bg-paper p-4 font-serif text-lg leading-relaxed ring-1 ring-ink/10 outline-none placeholder:font-sans placeholder:text-sm placeholder:text-ink/40 focus:ring-2 focus:ring-coral"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || pending}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity disabled:opacity-40"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Salvar resenha
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-graphite hover:bg-ink/5"
          >
            Cancelar
          </button>
        )}
        <p aria-live="polite" className="text-sm">
          {status === "saved" && !dirty && (
            <span className="inline-flex items-center gap-1 text-[#2F5654]">
              <Check className="size-4" aria-hidden /> Salva
            </span>
          )}
          {status === "error" && <span className="text-coral-dark">Não foi possível salvar. Tente de novo.</span>}
        </p>
      </div>
    </form>
  );
}
