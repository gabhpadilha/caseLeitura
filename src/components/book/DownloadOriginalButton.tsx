"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadOriginal } from "@/lib/books/original";
import { createClient } from "@/lib/supabase/client";
import { BOOKS_BUCKET } from "@/types/book";

interface Props {
  /** Caminho lógico do original (`…/original.pdf`); as partes ficam ao lado dele. */
  path: string;
  /** Nome do arquivo baixado, com extensão. */
  filename: string;
  /** "PDF" ou "CBZ", só para o rótulo. */
  format: string;
  className?: string;
}

/**
 * Baixa originais enviados em partes: junta os pedaços no aparelho e entrega o arquivo
 * inteiro. Originais pequenos continuam usando o link direto, sem passar por aqui.
 */
export function DownloadOriginalButton({ path, filename, format, className }: Props) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const blob = await downloadOriginal(createClient().storage.from(BOOKS_BUCKET), path);
      if (!blob) throw new Error("missing");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      window.alert("Não foi possível baixar o arquivo agora. Tente de novo em instantes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={`Baixar ${format} original`}
      aria-label={`Baixar ${format} original`}
      className={className}
    >
      {pending ? (
        <Loader2 className="size-[1.15rem] animate-spin" aria-hidden />
      ) : (
        <Download className="size-[1.15rem]" aria-hidden />
      )}
    </button>
  );
}
