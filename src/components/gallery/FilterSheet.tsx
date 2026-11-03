"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";

interface FilterSheetProps {
  /** Texto do botão (o valor escolhido). */
  label: string;
  /** Rótulo pequeno acima do valor ("Estado", "Categoria"…). */
  caption: string;
  /** Destaca o botão quando o filtro foge do padrão. */
  active?: boolean;
  /** Título da folha. */
  title: string;
  /** Botão só com ícone (o rótulo vira texto para leitor de tela). */
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Botão de filtro do celular: abre uma folha que sobe de baixo com as opções (links).
 * Tocar numa opção, no fundo ou no X fecha.
 */
export function FilterSheet({ label, caption, active = false, title, icon, children }: FilterSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClick(e: MouseEvent<HTMLDialogElement>) {
    // Fundo escurecido (o próprio <dialog>) ou uma opção escolhida.
    if (e.target === ref.current || (e.target as HTMLElement).closest("a")) setOpen(false);
  }

  return (
    <>
      {icon ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`${caption}: ${label}`}
          className={`flex w-13 shrink-0 items-center justify-center rounded-2xl ring-1 transition-colors ${
            active ? "bg-coral-soft text-coral-dark ring-coral/40" : "bg-paper-soft ring-ink/10"
          }`}
        >
          {icon}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={`flex min-w-0 flex-1 items-center justify-between gap-1 rounded-2xl py-2 pr-2.5 pl-3.5 text-left ring-1 transition-colors ${
            active ? "bg-coral-soft ring-coral/40" : "bg-paper-soft ring-ink/10"
          }`}
        >
          <span className="min-w-0">
            <span className="block text-[0.65rem] font-semibold tracking-wider text-graphite uppercase">
              {caption}
            </span>
            <span className={`block truncate text-sm font-semibold ${active ? "text-coral-dark" : ""}`}>{label}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-graphite" aria-hidden />
        </button>
      )}

      <dialog
        ref={ref}
        aria-label={title}
        onClose={() => setOpen(false)}
        onClick={handleClick}
        className="mx-0 mt-auto mb-0 max-h-[80dvh] w-full max-w-none rounded-t-3xl bg-paper-soft p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      >
        <div className="sticky top-0 flex items-center justify-between bg-paper-soft px-5 pt-5 pb-3">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="flex size-10 items-center justify-center rounded-full hover:bg-ink/5"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </dialog>
    </>
  );
}
