"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { READING_STATUS_LABEL, type BookUpdate, type ReadingStatus } from "@/types/book";

interface StatusPickerProps {
  bookId: string;
  status: ReadingStatus;
  startedAt: string | null;
}

/** Data local (AAAA-MM-DD), não UTC: à noite no Brasil o UTC já é o dia seguinte. */
function today() {
  return new Date().toLocaleDateString("en-CA");
}

export function StatusPicker({ bookId, status: initialStatus, startedAt }: StatusPickerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function select(next: ReadingStatus) {
    if (next === status) return;
    const previous = status;
    setStatus(next);
    setError(null);

    startTransition(async () => {
      const patch: BookUpdate = { status: next };
      if (next === "reading" && !startedAt) patch.started_at = today();
      if (next === "finished") {
        patch.finished_at = today();
        patch.progress = 100;
      }

      const { error } = await createClient().from("books").update(patch).eq("id", bookId);
      if (error) {
        setStatus(previous);
        setError("Não foi possível atualizar o status. Tente de novo.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Status da leitura"
        aria-busy={pending}
        className="inline-flex flex-wrap gap-1 rounded-full bg-ink/5 p-1"
      >
        {(Object.keys(READING_STATUS_LABEL) as ReadingStatus[]).map((option) => (
          <button
            key={option}
            role="radio"
            aria-checked={status === option}
            onClick={() => select(option)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              status === option ? "bg-ink text-paper shadow-sm" : "text-ink/70 hover:bg-ink/5"
            }`}
          >
            {READING_STATUS_LABEL[option]}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-coral-dark">{error}</p>}
    </div>
  );
}
