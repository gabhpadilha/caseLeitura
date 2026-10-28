"use client";

import Form from "next/form";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

const inputClass =
  "w-full rounded-full bg-paper-soft py-3.5 pr-5 pl-12 ring-1 ring-ink/10 outline-none placeholder:text-graphite/80 focus:ring-2 focus:ring-coral";

/** Busca por título ou autor. Envia `?q=` para a página inicial. */
export function SearchBar() {
  const query = useSearchParams().get("q") ?? "";

  return (
    <Form action="/" role="search" className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute top-1/2 left-5 size-[1.1rem] -translate-y-1/2 text-graphite" aria-hidden />
      <input
        key={query}
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Buscar por título ou autor…"
        aria-label="Buscar livros"
        className={inputClass}
      />
    </Form>
  );
}

/** Mesmo visual enquanto os search params não estão disponíveis (pré-render). */
export function SearchBarFallback() {
  return (
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute top-1/2 left-5 size-[1.1rem] -translate-y-1/2 text-graphite" aria-hidden />
      <input disabled placeholder="Buscar por título ou autor…" aria-label="Buscar livros" className={inputClass} />
    </div>
  );
}
