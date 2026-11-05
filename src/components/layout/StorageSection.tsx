"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, HardDrive } from "lucide-react";
import { formatBytes, getBookSizes, getStorageUsage, type StorageUsage } from "@/lib/books/quota";
import { createClient } from "@/lib/supabase/client";
import { READING_STATUS_LABEL, type ReadingStatus } from "@/types/book";

interface StorageSectionProps {
  /** Só carrega quando o menu abre. */
  open: boolean;
  /** Chamado ao seguir um link (para fechar o menu). */
  onNavigate: () => void;
}

interface Candidate {
  id: string;
  title: string;
  status: ReadingStatus;
  bytes: number;
}

/** Livros lidos ou abandonados que o usuário mais ganha espaço arquivando. */
const MAX_CANDIDATES = 4;
/** Abaixo disso não vale a pena sugerir (a capa e a ficha já pesam isso). */
const MIN_CANDIDATE_BYTES = 512 * 1024;

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; usage: StorageUsage; candidates: Candidate[] };

function tone(ratio: number) {
  if (ratio >= 1) return { bar: "bg-coral-dark", text: "text-coral-dark" };
  if (ratio >= 0.8) return { bar: "bg-coral", text: "text-coral-dark" };
  return { bar: "bg-sage", text: "text-graphite" };
}

/** "Meu espaço": barra de uso da cota e os maiores livros que já dá para arquivar. */
export function StorageSection({ open, onNavigate }: StorageSectionProps) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [usage, sizes, books] = await Promise.all([
        getStorageUsage(),
        getBookSizes(),
        createClient()
          .from("books")
          .select("id, title, status, archive_level")
          .in("status", ["finished", "abandoned"])
          .is("archive_level", null),
      ]);
      if (cancelled) return;
      if (!usage) return setState({ kind: "error" });
      const bytesById = new Map(sizes.map((s) => [s.bookId, s.bytes]));
      const candidates = (books.data ?? [])
        .map((b) => ({ id: b.id, title: b.title, status: b.status, bytes: bytesById.get(b.id) ?? 0 }))
        .filter((c) => c.bytes >= MIN_CANDIDATE_BYTES)
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, MAX_CANDIDATES);
      setState({ kind: "ready", usage, candidates });
    })().catch(() => !cancelled && setState({ kind: "error" }));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const ratio = state.kind === "ready" ? state.usage.usedBytes / state.usage.quotaBytes : 0;
  const colors = tone(ratio);

  return (
    <section aria-labelledby="espaco-titulo" className="border-t border-ink/10 pt-4">
      <h3 id="espaco-titulo" className="flex items-center gap-2 text-sm font-semibold">
        <HardDrive className="size-4" aria-hidden /> Meu espaço
      </h3>

      {state.kind === "loading" && (
        <div className="mt-3 animate-pulse" role="status" aria-label="Carregando seu espaço">
          <div className="h-3 w-48 rounded bg-ink/10" />
          <div className="mt-2 h-2 rounded-full bg-ink/10" />
        </div>
      )}
      {state.kind === "error" && (
        <p className="mt-2 text-xs text-graphite">Não foi possível ver seu espaço agora. Feche e abra o menu para tentar de novo.</p>
      )}
      {state.kind === "ready" && (
        <>
          <p className={`mt-1 text-xs ${colors.text}`}>
            Você usa {formatBytes(state.usage.usedBytes)} de {formatBytes(state.usage.quotaBytes)}
            {ratio >= 1 && ". Seu espaço está cheio: arquive livros para enviar novos."}
            {ratio >= 0.8 && ratio < 1 && ". Está acabando: arquive livros já lidos."}
          </p>
          <div
            role="progressbar"
            aria-label="Espaço usado"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(ratio * 100))}
            className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10"
          >
            <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${Math.min(100, Math.max(ratio * 100, 1))}%` }} />
          </div>

          {state.candidates.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-graphite">Livros que mais pesam e você já terminou ou deixou de lado:</p>
              <ul className="mt-1.5 flex flex-col">
                {state.candidates.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.title}</span>
                      <span className="text-xs text-graphite">
                        {READING_STATUS_LABEL[c.status]} · {formatBytes(c.bytes)}
                      </span>
                    </span>
                    <Link
                      href={`/livros/${c.id}`}
                      onClick={onNavigate}
                      aria-label={`Arquivar ${c.title}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-ink/20 hover:bg-white"
                    >
                      <Archive className="size-3.5" aria-hidden />
                      Arquivar
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
