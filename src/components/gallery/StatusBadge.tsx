import { READING_STATUS_LABEL, type ReadingStatus } from "@/types/book";

const BADGE_CLASSES: Record<ReadingStatus, string> = {
  reading: "bg-coral-soft text-coral-dark",
  to_read: "bg-sage-soft text-[#2F5654]",
  finished: "bg-wood-soft text-[#7A5A30]",
  abandoned: "bg-ink/10 text-graphite",
};

interface StatusBadgeProps {
  status: ReadingStatus;
  /** Texto alternativo (ex.: "Lendo agora"). */
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-3.5 py-1 text-sm font-semibold ${BADGE_CLASSES[status]}`}>
      {label ?? READING_STATUS_LABEL[status]}
    </span>
  );
}
