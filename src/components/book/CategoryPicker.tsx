"use client";

import { Check } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_GROUP_LABEL,
  MAX_CATEGORIES,
  type CategoryGroup,
} from "@/lib/books/categories";

interface CategoryPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

const GROUPS = Object.keys(CATEGORY_GROUP_LABEL) as CategoryGroup[];

/** Chips de categoria, até MAX_CATEGORIES. Cheio, os outros ficam bloqueados até desmarcar um. */
export function CategoryPicker({ value, onChange, disabled = false }: CategoryPickerProps) {
  const full = value.length >= MAX_CATEGORIES;

  function toggle(slug: string) {
    if (value.includes(slug)) onChange(value.filter((s) => s !== slug));
    else if (!full) onChange([...value, slug]);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-graphite" aria-live="polite">
        Escolha até {MAX_CATEGORIES}.{" "}
        {value.length > 0 && (
          <b className="text-ink">
            {value.length} {value.length === 1 ? "escolhida" : "escolhidas"}.
          </b>
        )}
      </p>
      {GROUPS.map((group) => (
        <fieldset key={group}>
          <legend className="text-xs font-bold tracking-wider text-graphite uppercase">
            {CATEGORY_GROUP_LABEL[group]}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.group === group).map((c) => {
              const on = value.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled || (full && !on)}
                  onClick={() => toggle(c.slug)}
                  className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm transition-colors disabled:cursor-not-allowed ${
                    on
                      ? "bg-coral font-semibold text-white"
                      : "ring-1 ring-ink/15 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
                  }`}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
