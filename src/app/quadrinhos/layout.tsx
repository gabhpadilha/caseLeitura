import { Bangers, Comic_Neue } from "next/font/google";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Só a banca usa essas fontes: carregadas aqui, não no layout raiz.
const hq = Bangers({ variable: "--font-bangers", subsets: ["latin"], weight: "400" });
const balloon = Comic_Neue({ variable: "--font-comic-neue", subsets: ["latin"], weight: ["400", "700"] });

/** Banca de quadrinhos: identidade própria (revistaria), fora do layout da biblioteca. */
export default function QuadrinhosLayout({ children }: LayoutProps<"/quadrinhos">) {
  return (
    <div className={`${hq.variable} ${balloon.variable} min-h-dvh bg-hq-cream text-hq-ink`}>
      <nav
        aria-label="Navegação"
        className="flex items-center justify-between gap-4 bg-hq-ink px-5 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3.5 text-sm font-semibold text-hq-cream sm:px-8"
      >
        <Link href="/" className="flex items-center gap-1 hover:text-hq-yellow">
          <ChevronLeft className="size-4" aria-hidden />
          caseLeitura
        </Link>
        <p className="flex gap-2">
          <Link href="/" className="opacity-60 hover:opacity-100">
            Livros
          </Link>
          <span className="opacity-40" aria-hidden>
            ·
          </span>
          <span className="text-hq-yellow" aria-current="page">
            Quadrinhos
          </span>
        </p>
      </nav>
      {children}
    </div>
  );
}
