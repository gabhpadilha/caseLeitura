"use client";

import { useState, type ReactNode } from "react";
import { EyeOff } from "lucide-react";

/** Texto com spoiler: borrado e inacessível até a pessoa tocar em "Mostrar". */
export function Spoiler({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  if (shown) return <>{children}</>;
  return (
    <div className="relative min-h-20 rounded-2xl bg-ink/[0.03]">
      {/* O texto continua no lugar (mantém a altura), mas borrado e escondido de leitores de tela. */}
      <div aria-hidden className="pointer-events-none max-h-32 overflow-hidden blur-md select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setShown(true)}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-lg hover:bg-ink/85"
        >
          <EyeOff className="size-4" aria-hidden />
          Contém spoiler · tocar para ler
        </button>
      </div>
    </div>
  );
}
