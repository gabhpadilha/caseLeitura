"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Apagar um comentário (o autor ou o dono da resenha; o banco confere). Pede confirmação com um 2º toque. */
export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const { error } = await createClient().from("review_comments").delete().eq("id", commentId);
    setPending(false);
    setConfirming(false);
    if (!error) router.refresh();
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-3 py-1 font-semibold text-coral-dark"
        >
          {pending && <Loader2 className="size-3 animate-spin" aria-hidden />}
          Apagar
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full px-2 py-1 font-semibold text-graphite hover:bg-ink/5"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Apagar comentário"
      className="flex size-8 items-center justify-center rounded-full text-graphite hover:bg-ink/5 hover:text-coral-dark"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}
