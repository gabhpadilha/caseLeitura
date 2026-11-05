"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import { Modal, modalPrimaryButton, modalSecondaryButton } from "@/components/ui/Modal";
import { archiveBook, canArchiveFully, getArchiveSavings, type ArchiveSavings } from "@/lib/books/archive";
import { formatBytes } from "@/lib/books/quota";
import type { ArchiveLevel, Book } from "@/types/book";

interface ArchiveButtonProps {
  book: Pick<Book, "id" | "title" | "kind" | "pdf_path" | "content_path" | "archive_level">;
  className?: string;
}

/** Botão de arquivar com diálogo: a pessoa escolhe quanto liberar e vê o tamanho de cada opção. */
export function ArchiveButton({ book, className = "" }: ArchiveButtonProps) {
  const router = useRouter();
  const fullAllowed = canArchiveFully(book);
  // Já arquivado só do original: a única opção que sobra é o arquivamento completo.
  const originalAllowed = book.archive_level !== "original";
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<ArchiveLevel>(originalAllowed ? "original" : "full");
  const [savings, setSavings] = useState<ArchiveSavings | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Os tamanhos só são consultados quando o diálogo abre.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getArchiveSavings(book)
      .then((s) => !cancelled && setSavings(s))
      .catch(() => !cancelled && setSavings({ original: 0, full: 0 }));
    return () => {
      cancelled = true;
    };
  }, [open, book]);

  async function handleArchive() {
    setPending(true);
    setError(null);
    try {
      await archiveBook(book, level);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  const options: { value: ArchiveLevel; title: string; text: string; bytes: number | undefined }[] = [
    ...(originalAllowed
      ? [
          {
            value: "original" as const,
            title: "Só o arquivo original",
            text: "Você continua lendo normalmente. Só deixa de ser possível baixar o arquivo e reprocessar o texto.",
            bytes: savings?.original,
          },
        ]
      : []),
    ...(fullAllowed
      ? [
          {
            value: "full" as const,
            title: "Tudo que pesa, mantendo capa e resenha",
            text: "Ficam só a ficha, a capa, a resenha e o histórico de leitura. Para ler de novo, é preciso enviar o PDF outra vez.",
            bytes: savings?.full,
          },
        ]
      : []),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        title="Arquivar para liberar espaço"
        aria-label="Arquivar para liberar espaço"
        className={className}
      >
        <Archive className="size-[1.15rem]" aria-hidden />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="arquivar-titulo" dismissible={!pending}>
        <h2 id="arquivar-titulo" className="font-display text-2xl leading-tight font-semibold">
          Arquivar “{book.title}”
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          Libera espaço no seu armazenamento. A capa, a resenha, o progresso e o status de leitura são mantidos.
        </p>

        <fieldset className="mt-4 flex flex-col gap-2" disabled={pending}>
          <legend className="sr-only">O que arquivar</legend>
          {options.map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-coral ${
                level === o.value ? "bg-paper ring-2 ring-ink" : "ring-ink/15 hover:bg-white"
              }`}
            >
              <input
                type="radio"
                name="arquivar-nivel"
                value={o.value}
                checked={level === o.value}
                onChange={() => setLevel(o.value)}
                className="mt-1 accent-ink"
              />
              <span className="text-sm">
                <span className="block font-semibold">{o.title}</span>
                <span className="mt-0.5 block leading-relaxed text-graphite">{o.text}</span>
                <span className="mt-1 block font-medium text-coral-dark">
                  {o.bytes === undefined ? "Calculando…" : `Libera cerca de ${formatBytes(o.bytes)}`}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <p className="mt-4 text-xs leading-relaxed text-graphite">
          Os arquivos apagados não podem ser recuperados por nós: para restaurar, você precisa ter o arquivo
          {fullAllowed ? " (PDF)" : ""} e enviá-lo de novo.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-coral-dark">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} disabled={pending} className={modalSecondaryButton}>
            Cancelar
          </button>
          <button type="button" onClick={handleArchive} disabled={pending} className={modalPrimaryButton}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Arquivar
          </button>
        </div>
      </Modal>
    </>
  );
}
