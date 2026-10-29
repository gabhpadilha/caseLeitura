import type { ReactNode } from "react";
import { READING_STATUS_LABEL, type ReadingStatus } from "@/types/book";

const BADGE_CLASSES: Record<ReadingStatus, string> = {
  reading: "bg-coral-soft text-coral-dark",
  to_read: "bg-sage-soft text-[#2F5654]",
  finished: "bg-wood-soft text-[#7A5A30]",
  abandoned: "bg-[#E6E1D8] text-graphite",
};

const SIZE_CLASSES = {
  md: "gap-1.5 px-3.5 py-1 text-sm",
  /** Selo sobre a capa: menor e com sombra para destacar da imagem. */
  sm: "gap-1 px-2.5 py-1 text-[0.7rem] leading-none shadow-[0_2px_6px_rgba(36,35,43,0.25)]",
};

interface StatusBadgeProps {
  status: ReadingStatus;
  /** Texto alternativo (ex.: "Lendo agora", "Lido · ★ 4,0"). */
  label?: ReactNode;
  icon?: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
}

export function StatusBadge({ status, label, icon, size = "md" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${BADGE_CLASSES[status]} ${SIZE_CLASSES[size]}`}
    >
      {icon}
      {label ?? READING_STATUS_LABEL[status]}
    </span>
  );
}
