"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { reprocessBook } from "@/lib/books/upload";
import { progressLabel } from "@/lib/pdf/extract";
import type { Book } from "@/types/book";

interface ReprocessButtonProps {
  book: Pick<Book, "id" | "pdf_path">;
}

export function ReprocessButton({ book }: ReprocessButtonProps) {
  const router = useRouter();
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleClick() {
    setMessage(null);
    setProgress("Baixando o PDF…");
    try {
      await reprocessBook(book, (p) => {
        const label = progressLabel(p);
        setProgress(`${label.charAt(0).toUpperCase()}${label.slice(1)}…`);
      });
      setMessage({ ok: true, text: "Texto atualizado." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Algo deu errado." });
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="rounded-2xl bg-paper-soft p-5 text-sm">
      <p className="text-graphite">
        Títulos embolados, ilustrações faltando ou PDF escaneado? Extraia o texto de novo a partir do PDF original.
      </p>
      <button
        onClick={handleClick}
        disabled={progress !== null}
        className="mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-medium ring-1 ring-ink/20 transition-colors hover:bg-ink/5 disabled:opacity-60"
      >
        {progress ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="size-4" aria-hidden />
        )}
        {progress ?? "Reprocessar texto"}
      </button>
      {message && (
        <p aria-live="polite" className={`mt-2 ${message.ok ? "text-[#2F5654]" : "text-coral-dark"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
