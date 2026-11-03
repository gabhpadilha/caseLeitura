"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Limite da constraint review_comments.content. */
const MAX = 2000;

/** Escrever um comentário. O banco confere se a resenha está compartilhada. */
export function CommentForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setPending(true);
    setError(null);
    const { error } = await createClient().from("review_comments").insert({ review_id: reviewId, content: text });
    setPending(false);
    if (error) {
      return setError(
        error.code === "42501"
          ? "Essa resenha não está mais compartilhada."
          : "Não foi possível comentar. Tente de novo.",
      );
    }
    setContent("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        maxLength={MAX}
        placeholder="Escreva um comentário…"
        aria-label="Comentário"
        className="w-full resize-y rounded-2xl bg-paper p-4 leading-relaxed ring-1 ring-ink/10 outline-none placeholder:text-sm placeholder:text-ink/40 focus:ring-2 focus:ring-coral"
      />
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-coral-dark">
          {error}
        </p>
        <button
          type="submit"
          disabled={pending || !content.trim()}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-40"
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          Comentar
        </button>
      </div>
    </form>
  );
}
