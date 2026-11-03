const COLORS = ["bg-sage", "bg-coral", "bg-[#8A5F24]", "bg-[#23314A]", "bg-[#4A3049]", "bg-[#3D6F6B]"];

function colorFor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface AvatarProps {
  name: string;
  /** Define a cor (o id do leitor, para cada um ter sempre a mesma). */
  seed: string;
  className?: string;
}

/** Inicial do nome num círculo colorido. */
export function Avatar({ name, seed, className = "size-11 text-lg" }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorFor(seed)} ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
