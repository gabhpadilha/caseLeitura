interface LogoMarkProps {
  className?: string;
}

/** Símbolo caseLeitura: telhado com chaminé (terracota) sobre um livro aberto (tinta). */
export function LogoMark({ className = "size-8" }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M8 19 24 7l16 12"
        stroke="var(--color-coral)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M33 9.5V6h3.5v6.2" stroke="var(--color-coral)" strokeWidth="3" strokeLinejoin="round" />
      <path
        d="M24 21c-4-2.6-8.6-3.3-13-2.4v19.6c4.4-.9 9-.2 13 2.4 4-2.6 8.6-3.3 13-2.4V18.6c-4.4-.9-9-.2-13 2.4Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M24 21v19.6" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

interface WordmarkProps {
  className?: string;
}

/** "case" em itálico terracota + "Leitura" em tinta, na Cormorant. */
export function Wordmark({ className = "text-3xl" }: WordmarkProps) {
  return (
    <span className={`font-display font-semibold tracking-tight ${className}`}>
      <span className="font-medium text-coral italic">case</span>Leitura
    </span>
  );
}
