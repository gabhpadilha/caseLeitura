import { READING_STATUS_LABEL, type ReadingStatus } from "@/types/book";

const BADGE_CLASSES: Record<ReadingStatus, string> = {
  reading: "bg-coral-soft text-coral-dark",
  to_read: "bg-sage-soft text-[#2F5654]",
  finished: "bg-wood-soft text-[#7A5A30]",
  abandoned: "bg-[#E6E1D8] text-graphite",
};

const SIZE_CLASSES = {
  md: "px-3.5 py-1 text-sm",
  /** Mini tag sobre a capa: menor e com sombra para destacar da imagem. */
  sm: "px-2.5 py-0.5 text-[0.7rem] shadow-[0_2px_6px_rgba(36,35,43,0.25)]",
};

interface StatusBadgeProps {
  status: ReadingStatus;
  /** Texto alternativo (ex.: "Lendo agora"). */
  label?: string;
  size?: keyof typeof SIZE_CLASSES;
}

export function StatusBadge({ status, label, size = "md" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full font-semibold whitespace-nowrap ${BADGE_CLASSES[status]} ${SIZE_CLASSES[size]}`}
    >
      {label ?? READING_STATUS_LABEL[status]}
    </span>
  );
}
