// Banca de quadrinhos: a mesma identidade da biblioteca (papel, tinta, madeira e
// terracota), com detalhes discretos de revistaria — toldo listrado, expositor
// de capas e etiqueta de preço com o estado.
import Link from "next/link";
import { ArrowUpRight, Plus, Star, Upload } from "lucide-react";
import { estimatedPage, formatPercent, formatRating } from "@/lib/books/format";
import { continueCard } from "@/components/gallery/ContinueReading";
import { BADGE_CLASSES } from "@/components/gallery/StatusBadge";
import { READING_STATUS_LABEL, type BookCard } from "@/types/book";

const NEW_COMIC_HREF = "/livros/novo?tipo=quadrinho";

// Capas sem imagem: os tons de encadernação da biblioteca, sorteados pelo id.
const PLAIN = ["bg-[#A34E3A]", "bg-[#23314A]", "bg-[#2E4A3F]", "bg-[#8A5F24]", "bg-[#4A3049]", "bg-[#3D6F6B]"];

/** Retícula de gibi, bem leve, por cima das capas sem imagem. */
const halftone = "bg-[radial-gradient(rgb(255_255_255/0.13)_1.2px,transparent_1.5px)] bg-size-[9px_9px]";

function pick(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PLAIN[Math.abs(hash) % PLAIN.length];
}

interface ComicCoverProps {
  comic: Pick<BookCard, "id" | "title" | "coverUrl">;
  className?: string;
}

/** Capa de revista: fina, cantos quase retos, sem lombada. */
export function ComicCover({ comic, className = "" }: ComicCoverProps) {
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-[3px] bg-ink/10 shadow-[0_14px_22px_-12px_rgba(36,35,43,0.55)] ${className}`}
    >
      {comic.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL do Storage
        <img src={comic.coverUrl} alt="" className="size-full object-cover" />
      ) : (
        <div className={`flex size-full flex-col ${pick(comic.id)}`}>
          {/* Cabeçalho da revista, como o logotipo no topo de um gibi. */}
          <p className="line-clamp-3 bg-paper-soft px-2.5 py-2 font-display text-[1.05rem] leading-[1.05] font-semibold text-ink">
            {comic.title}
          </p>
          <div className={`flex-1 ${halftone}`} />
        </div>
      )}
    </div>
  );
}

/** Etiqueta de preço colada na capa, com o estado e o detalhe que importa. */
function PriceTag({ comic }: { comic: BookCard }) {
  const text =
    comic.status === "reading" && comic.progress > 0 ? (
      `Lendo · ${formatPercent(comic.progress)}`
    ) : comic.status === "finished" && comic.rating ? (
      <>
        Lido · <Star className="size-2.5 fill-current" aria-hidden />
        {formatRating(comic.rating)}
      </>
    ) : (
      READING_STATUS_LABEL[comic.status]
    );

  return (
    <span
      className={`absolute bottom-2.5 -left-1.5 inline-flex -rotate-3 items-center gap-1 rounded-[3px] py-1 pr-2 pl-1.5 text-[0.68rem] leading-none font-semibold whitespace-nowrap shadow-[0_2px_6px_rgba(36,35,43,0.25)] ${BADGE_CLASSES[comic.status]}`}
    >
      {/* Furo da etiqueta */}
      <span aria-hidden className="size-1.5 rounded-full bg-paper-soft/90 ring-1 ring-current/25" />
      {text}
    </span>
  );
}

/** Progresso em quadrinhos: uma fileira de quadros que vão sendo preenchidos. */
function PanelProgress({ progress }: { progress: number }) {
  const panels = 12;
  const filled = Math.round((progress / 100) * panels);
  return (
    <div className="mt-2.5 flex max-w-xs gap-[3px]" role="img" aria-label={`${formatPercent(progress)} lido`}>
      {Array.from({ length: panels }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-[1px] ${i < filled ? "bg-coral" : "bg-ink/10"}`} />
      ))}
    </div>
  );
}

interface ComicContinueProps {
  name: string | null;
  /** Gibi em destaque: o último lido, ou o próximo da fila. */
  comic: BookCard | null;
}

/** Atalho do topo, igual ao da página Livros: volta direto para o gibi em andamento. */
export function ComicContinue({ name, comic }: ComicContinueProps) {
  if (!comic) {
    return (
      <section className={continueCard}>
        <div className="min-w-0 flex-1 px-2 py-3">
          <p className="text-xs font-semibold tracking-widest text-coral-dark uppercase">
            Banca aberta{name ? `, ${name}` : ""}
          </p>
          <p className="mt-2 font-display text-2xl leading-snug font-medium sm:text-3xl">
            Envie um gibi em PDF ou CBZ e ele vai para o expositor.
          </p>
        </div>
        <Link
          href={NEW_COMIC_HREF}
          className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper hover:bg-ink/85"
        >
          <Upload className="size-4" aria-hidden />
          <span className="hidden sm:inline">Enviar gibi</span>
        </Link>
      </section>
    );
  }

  const started = comic.progress > 0;
  const page = estimatedPage(comic.progress, comic.page_count);

  return (
    <section className={continueCard}>
      <Link href={`/livros/${comic.id}`} aria-label={`Página de ${comic.title}`} className="shrink-0">
        <ComicCover comic={comic} className="w-16 sm:w-20" />
      </Link>
      <Link href={`/leitor/${comic.id}`} className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-widest text-coral-dark uppercase">
          {started ? "Continuar lendo" : "Próximo gibi"}
        </p>
        <h2 className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">{comic.title}</h2>
        <p className="truncate text-sm text-graphite">
          {[comic.author, page && comic.page_count ? `página ${page} de ${comic.page_count}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {started && <PanelProgress progress={comic.progress} />}
      </Link>
      <Link
        href={`/leitor/${comic.id}`}
        className="hidden shrink-0 items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:bg-ink/85 sm:flex"
      >
        {started ? `Abrir · ${formatPercent(comic.progress)}` : "Começar a ler"}
        <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

/** Toldo listrado de banca, com a barra recortada em ondas. */
function Awning() {
  const stripe = "var(--color-coral) 0 28px, var(--color-wood-soft) 28px 56px";
  return (
    <div aria-hidden>
      <div className="h-5" style={{ background: `repeating-linear-gradient(90deg, ${stripe})` }} />
      <div
        className="h-3 bg-size-[56px_100%]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 14px 0, var(--color-coral) 13.5px, transparent 14px), radial-gradient(circle at 42px 0, var(--color-wood-soft) 13.5px, transparent 14px)",
        }}
      />
    </div>
  );
}

/**
 * Expositor: capas lado a lado, cada fileira pousada numa prateleira de madeira.
 * A largura da capa é fixa (por tamanho de tela), então toda fileira tem a mesma
 * altura e as prateleiras são um fundo que se repete, de ponta a ponta.
 */
export function ComicRack({ comics }: { comics: BookCard[] }) {
  const cover = "calc(var(--w) * 1.5)";
  const shelves = `repeating-linear-gradient(to bottom,
    transparent 0 ${cover},
    #E8D3B0 ${cover} calc(${cover} + 4px),
    #CDA77C calc(${cover} + 4px), #B38A60 calc(${cover} + 0.9rem),
    rgb(91 70 54 / 0.16) calc(${cover} + 0.9rem), transparent calc(${cover} + 1.5rem) calc(${cover} + 3.4rem))`;

  return (
    <div className="overflow-hidden rounded-[2rem] bg-paper-soft ring-1 ring-ink/5">
      <Awning />
      <ul
        className="grid grid-cols-[repeat(auto-fill,var(--w))] justify-evenly gap-x-6 gap-y-10 bg-repeat-x bg-origin-content px-5 pt-7 pb-6 [--w:7.5rem] sm:px-8 sm:[--w:8.5rem]"
        style={{ backgroundImage: shelves }}
      >
        {comics.map((comic) => (
          <li key={comic.id} className="pb-[0.9rem]">
            <Link
              href={`/livros/${comic.id}`}
              title={comic.title}
              aria-label={`${comic.title}${comic.author ? `, de ${comic.author}` : ""}`}
              className="relative block rounded-[3px] transition-transform duration-300 hover:-translate-y-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral"
            >
              <ComicCover comic={comic} />
              <PriceTag comic={comic} />
            </Link>
          </li>
        ))}
        <li className="pb-[0.9rem]">
          <Link
            href={NEW_COMIC_HREF}
            className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-[3px] border-2 border-dashed border-ink/20 text-center text-sm font-semibold text-graphite transition-colors hover:border-coral hover:text-coral-dark"
          >
            <Plus className="size-6" strokeWidth={1.8} aria-hidden />
            Enviar gibi
          </Link>
        </li>
      </ul>
    </div>
  );
}

export function BancaSkeleton() {
  return (
    <div className="animate-pulse space-y-10" aria-busy="true" aria-label="Carregando quadrinhos">
      <div className="h-32 rounded-[2rem] bg-ink/5" />
      <div className="space-y-4">
        <div className="h-12 w-72 rounded-lg bg-ink/10" />
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-ink/10" />
          ))}
        </div>
      </div>
      <div className="h-96 rounded-[2rem] bg-ink/5" />
    </div>
  );
}
