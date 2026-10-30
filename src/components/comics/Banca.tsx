// Banca de quadrinhos: a página dos gibis com identidade de revistaria.
import Link from "next/link";
import type { BookCard } from "@/types/book";

const NEW_COMIC_HREF = "/livros/novo?tipo=quadrinho";

/** Contorno preto e sombra chapada, o "carimbo" visual da banca. */
const inked = "border-[3px] border-hq-ink shadow-[4px_4px_0_var(--color-hq-ink)]";
const halftone =
  "bg-[radial-gradient(rgb(0_0_0/0.1)_1.6px,transparent_1.8px)] bg-size-[12px_12px]";

// Capas sem imagem: cores primárias sorteadas pelo id.
const PLAIN = ["bg-hq-blue", "bg-hq-red", "bg-hq-yellow", "bg-[#2e9b5b]", "bg-[#7b3fb8]"];

function pick(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PLAIN[Math.abs(hash) % PLAIN.length];
}

interface ComicCoverProps {
  comic: Pick<BookCard, "id" | "title" | "coverUrl">;
  className?: string;
}

export function ComicCover({ comic, className = "" }: ComicCoverProps) {
  return (
    <div className={`relative aspect-[2/3] overflow-hidden bg-white ${inked} ${className}`}>
      {comic.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL do Storage
        <img src={comic.coverUrl} alt="" className="size-full object-cover" />
      ) : (
        <div className={`flex size-full flex-col ${pick(comic.id)} ${halftone}`}>
          <p className="border-b-[3px] border-hq-ink bg-white px-2 py-1.5 font-hq text-xl leading-none tracking-wide break-words">
            {comic.title}
          </p>
        </div>
      )}
    </div>
  );
}

/** Etiqueta colada na capa, como preço de banca. */
function statusTag(comic: BookCard): { text: string; className: string } {
  switch (comic.status) {
    case "reading":
      return { text: `Lendo ${Math.round(comic.progress)}%`, className: "bg-hq-yellow -rotate-6 left-[-10px]" };
    case "finished":
      return {
        text: comic.rating ? `Lido ★ ${comic.rating}` : "Lido",
        className: "bg-hq-red text-white rotate-6 left-[-10px]",
      };
    case "abandoned":
      return { text: "Parou", className: "bg-[#cfcfcf] -rotate-3 left-[-10px]" };
    default:
      return { text: "Na fila", className: "bg-white -rotate-4 left-[-10px]" };
  }
}

function StatusTag({ comic }: { comic: BookCard }) {
  const tag = statusTag(comic);
  return (
    <span
      className={`absolute bottom-3.5 border-[3px] border-hq-ink px-2 pt-1 pb-0.5 font-hq text-base leading-none tracking-wide whitespace-nowrap uppercase shadow-[3px_3px_0_var(--color-hq-ink)] ${tag.className}`}
    >
      {tag.text}
    </span>
  );
}

/** Explosão "POW" (polígono em estrela) usada no botão de enviar. */
function Burst({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <polygon
        points="100,4 118,52 162,22 150,72 198,74 158,104 192,142 142,138 146,190 108,156 84,198 72,150 24,176 42,128 2,110 44,88 14,46 64,56 66,8 88,48"
        className="fill-hq-yellow stroke-hq-ink"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ComicHeroProps {
  name: string | null;
  comics: BookCard[];
}

export function ComicHero({ name, comics }: ComicHeroProps) {
  const count = (status: BookCard["status"]) => comics.filter((c) => c.status === status).length;
  const stats = [
    `${comics.length} ${comics.length === 1 ? "gibi" : "gibis"} na banca`,
    `${count("reading")} lendo`,
    `${count("finished")} ${count("finished") === 1 ? "lido" : "lidos"}`,
    `${count("to_read")} na fila`,
  ];

  return (
    <header className={`relative overflow-hidden border-b-[5px] border-hq-ink bg-hq-red ${halftone}`}>
      {/* Raios de fundo, saindo de trás da explosão */}
      <svg viewBox="0 0 820 300" preserveAspectRatio="none" className="absolute inset-0 size-full opacity-20" aria-hidden>
        <g fill="#fff">
          <polygon points="620,150 820,40 820,90" />
          <polygon points="620,150 820,120 820,175" />
          <polygon points="620,150 820,210 820,270" />
          <polygon points="620,150 740,300 680,300" />
          <polygon points="620,150 560,300 520,300" />
          <polygon points="620,150 760,0 820,0" />
        </g>
      </svg>

      <div className="relative mx-auto flex max-w-5xl items-start justify-between gap-4 px-5 pt-7 pb-8 sm:px-8 sm:pt-9 sm:pb-10">
        <div className="min-w-0">
          <span className="inline-block -rotate-2 border-[3px] border-hq-ink bg-hq-yellow px-2.5 pt-1 pb-0.5 font-hq text-base tracking-wide uppercase sm:text-lg">
            Edição {name ? `do ${name}` : "especial"} · #{comics.length}
          </span>
          <h1 className="mt-3 origin-left -rotate-2 font-hq text-[clamp(2.6rem,10.5vw,7.4rem)] leading-[0.86] tracking-wide text-hq-yellow [paint-order:stroke_fill] [-webkit-text-stroke:8px_var(--color-hq-ink)] [text-shadow:7px_7px_0_var(--color-hq-ink)]">
            Meus
            <br />
            quadrinhos!
          </h1>
          <p className="mt-5 font-balloon text-lg font-bold text-white sm:text-xl">{stats.join(" · ")}</p>
        </div>

        <Link
          href={NEW_COMIC_HREF}
          className="relative mt-2 size-24 shrink-0 rotate-8 transition-transform hover:scale-105 hover:rotate-3 sm:size-48"
        >
          <Burst className="absolute inset-0 size-full" />
          <span className="absolute inset-0 flex flex-col items-center justify-center text-center font-hq leading-[0.9] uppercase">
            <span className="text-sm sm:text-xl">Enviar</span>
            <span className="text-xl text-hq-red sm:text-4xl">novo</span>
            <span className="text-sm sm:text-xl">gibi!</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

/** O gibi que está sendo lido, num quadro de HQ com balão de fala. */
export function ComicFeatured({ comic }: { comic: BookCard }) {
  const total = comic.page_count ?? 0;
  const page = total ? Math.max(1, Math.min(total, Math.round((comic.progress / 100) * total))) : 0;
  const started = comic.progress > 0;
  const tiles = 16;
  const filled = Math.round((comic.progress / 100) * tiles);
  const balloon = !started
    ? "Esse está esperando por você!"
    : total
      ? `Você parou na página ${page}! Faltam só ${total - page}.`
      : "Bora continuar de onde parou?";

  return (
    <section aria-label="Lendo agora" className="relative border-4 border-hq-ink bg-white p-5 shadow-[6px_6px_0_var(--color-hq-ink)] sm:p-6">
      <span className="absolute -top-1 -left-1 border-4 border-hq-ink bg-hq-yellow px-3 pt-1 pb-0.5 font-hq text-lg tracking-wide uppercase">
        Enquanto isso…
      </span>
      <div className="mt-8 grid gap-6 sm:grid-cols-[9.5rem_1fr] sm:gap-7">
        <Link href={`/livros/${comic.id}`} className="mx-auto w-36 sm:w-full">
          <ComicCover comic={comic} />
        </Link>
        <div className="min-w-0">
          <h2 className="font-hq text-4xl leading-none tracking-wide uppercase sm:text-5xl">{comic.title}</h2>
          {comic.author && <p className="mt-1 font-balloon text-lg font-bold text-[#555]">{comic.author}</p>}

          <div className="relative mt-5 max-w-sm rounded-[50%/45%] border-[3px] border-hq-ink bg-white px-7 py-4 text-center font-balloon text-lg font-bold">
            {balloon}
            <svg width="34" height="26" viewBox="0 0 34 26" className="absolute -bottom-[21px] left-1/3 overflow-visible" aria-hidden>
              <path d="M2 0 L10 24 L28 0" fill="#fff" stroke="var(--color-hq-ink)" strokeWidth="3" strokeLinejoin="round" />
              <rect x="4" y="-4" width="22" height="6" fill="#fff" />
            </svg>
          </div>

          <div className="mt-8 flex gap-1" role="img" aria-label={`${Math.round(comic.progress)}% lido`}>
            {Array.from({ length: tiles }, (_, i) => (
              <span key={i} className={`h-4 flex-1 border-2 border-hq-ink ${i < filled ? "bg-hq-red" : "bg-white"}`} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="font-hq text-xl tracking-wide uppercase">
              {total ? `${page} / ${total} páginas` : `${Math.round(comic.progress)}% lido`}
            </span>
            <Link
              href={`/leitor/${comic.id}`}
              className="bg-hq-ink px-5 pt-2.5 pb-1.5 font-hq text-xl tracking-wide text-hq-yellow uppercase shadow-[4px_4px_0_var(--color-hq-red)] transition-transform hover:-translate-y-0.5"
            >
              {started ? "Continuar lendo ›" : "Começar a ler ›"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Medidas da fileira do expositor: capa 7.5rem × 1.5 + pb-9 (prateleira), gap-y-10. */
const RACK = { railTop: "11.75rem", row: "13.5rem", period: "16rem" };

/** Expositor de banca: grade de capas sobre prateleiras de metal. */
export function ComicRack({ comics }: { comics: BookCard[] }) {
  return (
    <section aria-labelledby="banca">
      <div className="flex items-center gap-3.5">
        <h2
          id="banca"
          className="-rotate-[1.5deg] border-4 border-hq-ink bg-hq-blue px-4 pt-1.5 pb-0.5 font-hq text-3xl tracking-wide text-white uppercase shadow-[5px_5px_0_var(--color-hq-ink)]"
        >
          Na sua banca
        </h2>
        <span className="h-1 flex-1 bg-hq-ink" aria-hidden />
        <span className="font-hq text-xl tracking-wide uppercase">
          {comics.length} {comics.length === 1 ? "gibi" : "gibis"}
        </span>
      </div>

      <div className={`mt-5 overflow-hidden border-4 border-hq-ink bg-[#2b2b2b] pt-6 pb-2 ${halftone}`}>
        {/* Largura fixa das capas: cada fileira tem a mesma altura, e as prateleiras
            de metal são um fundo que se repete a cada fileira, de ponta a ponta. */}
        <ul
          className="grid grid-cols-[repeat(auto-fill,7.5rem)] justify-evenly gap-x-6 gap-y-10 px-6"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${RACK.railTop}, #333 ${RACK.railTop} calc(${RACK.railTop} + 2px), #d6d6d6 calc(${RACK.railTop} + 2px), #8a8a8a calc(${RACK.row} - 2px), #333 calc(${RACK.row} - 2px) ${RACK.row}, transparent ${RACK.row} ${RACK.period})`,
          }}
        >
          {comics.map((comic) => (
            <li key={comic.id} className="relative pb-9">
              <Link href={`/livros/${comic.id}`} className="relative block transition-transform hover:-translate-y-1" title={comic.title}>
                <ComicCover comic={comic} />
                <StatusTag comic={comic} />
              </Link>
            </li>
          ))}
          <li className="relative pb-9">
            <Link
              href={NEW_COMIC_HREF}
              className="flex aspect-[2/3] flex-col items-center justify-center border-[3px] border-dashed border-white/40 text-center font-hq text-xl leading-tight tracking-wide text-hq-yellow uppercase hover:border-hq-yellow"
            >
              <span className="text-3xl">+</span>
              Enviar
              <br />
              gibi
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}

export function BancaSkeleton() {
  return (
    <div aria-busy="true">
      <div className="h-72 border-b-[5px] border-hq-ink bg-hq-red" />
      <div className="mx-auto max-w-5xl space-y-10 px-5 py-9 sm:px-8">
        <div className="h-64 border-4 border-hq-ink bg-white" />
        <div className="h-80 border-4 border-hq-ink bg-[#2b2b2b]" />
      </div>
    </div>
  );
}
