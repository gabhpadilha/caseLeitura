"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** id do título da janela (aria-labelledby). */
  labelledBy: string;
  /** false enquanto salva/apaga: Esc e clique fora deixam de fechar. */
  dismissible?: boolean;
  children: ReactNode;
}

/**
 * Janela modal sobre o <dialog> nativo: foco preso, Esc e clique no fundo
 * escurecido fecham. O estado `open` fica com quem usa.
 */
export function Modal({ open, onClose, labelledBy, dismissible = true, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      // Esc fecha o <dialog> sozinho; aqui só sincronizamos o estado.
      onClose={onClose}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault();
      }}
      // Clique no fundo: o alvo é o próprio <dialog>, não o conteúdo.
      onClick={(e) => {
        if (dismissible && e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-3xl bg-paper-soft p-0 text-ink shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6 sm:p-7">{children}</div>
    </dialog>
  );
}

/** Classes comuns dos campos e botões dentro das janelas. */
export const modalField =
  "w-full rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-coral";
export const modalSecondaryButton =
  "rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/20 hover:bg-white disabled:opacity-50";
export const modalPrimaryButton =
  "inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-60";
