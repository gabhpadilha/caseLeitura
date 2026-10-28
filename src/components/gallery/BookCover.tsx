interface BookCoverProps {
  title: string;
  author: string | null;
  coverUrl: string | null;
  /** Define a cor da capa padrão (livros sem imagem). */
  seed: string;
  className?: string;
  /** Tamanho do título na capa padrão. */
  size?: "sm" | "md" | "lg";
}

// Paleta de capas do design system: tons de encadernação, sorteados pelo id.
const PLAIN_COVERS = [
  "bg-[#2E4A3F]", // verde
  "bg-[#8A5F24]", // ocre
  "bg-[#23314A]", // marinho
  "bg-[#4A3049]", // ameixa
  "bg-[#A34E3A]", // terracota
  "bg-[#3D6F6B]", // petróleo
  "bg-[#393A40]", // grafite
  "bg-[#6A2A2E]", // vinho
];

const TITLE_SIZE = {
  sm: "text-[0.95rem]",
  md: "text-[1.15rem]",
  lg: "text-[2rem]",
};

function pick(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PLAIN_COVERS[Math.abs(hash) % PLAIN_COVERS.length];
}

/**
 * Capa com cara de livro físico. Sem imagem, gera a capa padrão do design:
 * cor sorteada, título em Cormorant e filetes dourados.
 */
export function BookCover({
  title,
  author,
  coverUrl,
  seed,
  className = "",
  size = "md",
}: BookCoverProps) {
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-[3px_7px_7px_3px] bg-ink/10 shadow-[0_16px_24px_-12px_rgba(36,35,43,0.55)] ${className}`}
    >
      {coverUrl ? (
        // Signed URL do Storage: <img> evita configurar remotePatterns do next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="size-full object-cover" />
      ) : (
        <div className={`flex size-full flex-col px-[10%] py-[8%] text-[#F6EEDD] ${pick(seed)}`}>
          <span aria-hidden className="h-px w-full bg-[#C9A96B]/70" />
          <span
            className={`my-auto line-clamp-5 font-display leading-[1.05] font-medium ${TITLE_SIZE[size]}`}
          >
            {title}
          </span>
          {author && (
            <>
              <span aria-hidden className="mb-[7%] h-px w-full bg-[#C9A96B]/50" />
              <span className="line-clamp-2 text-[0.55rem] leading-tight font-medium tracking-[0.14em] uppercase opacity-85">
                {author}
              </span>
            </>
          )}
        </div>
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[5%] bg-linear-to-r from-black/30 via-white/10 to-transparent"
      />
    </div>
  );
}
