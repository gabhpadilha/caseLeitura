"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Check, EyeOff, Loader2, Star, Users } from "lucide-react";
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

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  hint: string;
}

/** Chave liga/desliga com rótulo e explicação (role="switch"). */
function Toggle({ checked, onChange, disabled = false, icon, label, hint }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-ink/10 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
    >
      <span className={`shrink-0 ${checked ? "text-coral-dark" : "text-graphite"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs leading-relaxed text-graphite">{hint}</span>
      </span>
      <span
        aria-hidden
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-coral" : "bg-ink/15"}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-[left] ${checked ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}

export function ReviewForm({ bookId, review, onSaved, onCancel }: ReviewFormProps) {
  const [saved, setSaved] = useState({
    rating: review?.rating ?? null,
    content: review?.content ?? "",
    // Resenha nova já vem para compartilhar; uma existente mantém a escolha que foi salva.
    shared: review ? review.shared : true,
    spoiler: review?.spoiler ?? false,
  });
  const [rating, setRating] = useState<number | null>(saved.rating);
  const [content, setContent] = useState(saved.content);
  const [shared, setShared] = useState(saved.shared);
  const [spoiler, setSpoiler] = useState(saved.spoiler);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  // Post na timeline precisa de texto; sem ele a resenha fica só para você.
  const canShare = content.trim().length > 0;
  const willShare = shared && canShare;
  const dirty =
    rating !== saved.rating ||
    content.trim() !== saved.content.trim() ||
    willShare !== (saved.shared && saved.content.trim().length > 0) ||
    (willShare && spoiler !== saved.spoiler);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const next = { rating, content: content.trim(), shared: willShare, spoiler: willShare && spoiler };
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

      <div className="flex flex-col gap-2">
        <Toggle
          checked={willShare}
          disabled={!canShare}
          onChange={(v) => {
            setShared(v);
            setStatus("idle");
          }}
          icon={<Users className="size-5" aria-hidden />}
          label="Compartilhar na timeline"
          hint={
            canShare
              ? willShare
                ? "Os outros leitores veem a nota e a resenha."
                : "Só você vê esta resenha."
              : "Escreva algo para poder compartilhar."
          }
        />
        {willShare && (
          <Toggle
            checked={spoiler}
            onChange={(v) => {
              setSpoiler(v);
              setStatus("idle");
            }}
            icon={<EyeOff className="size-5" aria-hidden />}
            label="Contém spoiler"
            hint="O texto fica escondido na timeline até a pessoa tocar para ler."
          />
        )}
      </div>

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
