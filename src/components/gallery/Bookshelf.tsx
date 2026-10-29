"use client";

import { useEffect, useRef, useState } from "react";
import type { BookCard as BookCardData } from "@/types/book";
import { BookCard } from "./BookCard";

interface BookshelfProps {
  books: BookCardData[];
}

/** Largura mínima de um livro e espaço entre eles (px). */
const MIN_BOOK = 132;
const GAP = 32;

/** Quantos livros cabem por fileira na largura disponível. */
function columnsFor(width: number) {
  return Math.max(2, Math.floor((width + GAP) / (MIN_BOOK + GAP)));
}

/**
 * Tábua da estante: tampo claro em leve perspectiva, frente com degradê e veio
 * sutil, e sombra difusa projetada embaixo.
 */
export function Plank() {
  return (
    <div aria-hidden className="relative">
      {/* tampo */}
      <div className="h-2.5 bg-[#E8D3B0] [clip-path:polygon(1.2%_0,98.8%_0,100%_100%,0_100%)]" />
      {/* frente */}
      <div className="h-3.5 rounded-b-[3px] bg-linear-to-b from-[#CDA77C] to-[#B38A60] bg-[length:100%_100%] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
        <div className="h-full w-full rounded-b-[3px] bg-[repeating-linear-gradient(90deg,rgba(91,60,30,0.07)_0_2px,transparent_2px_11px,rgba(255,255,255,0.05)_11px_13px,transparent_13px_23px)]" />
      </div>
      {/* sombra na parede */}
      <div className="absolute inset-x-2 top-full h-5 bg-linear-to-b from-[#5B4636]/20 to-transparent blur-[3px]" />
    </div>
  );
}

/**
 * Estante geral: todos os livros em fileiras, cada uma pousada na sua tábua de
 * ponta a ponta. O número de livros por fileira vem da largura medida (a tábua
 * precisa saber onde cada fileira termina, o que o CSS sozinho não informa).
 */
export function Bookshelf({ books }: BookshelfProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setColumns(columnsFor(el.clientWidth)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const perRow = columns ?? 5;
  const rows: BookCardData[][] = [];
  for (let i = 0; i < books.length; i += perRow) rows.push(books.slice(i, i + perRow));

  return (
    <div
      ref={ref}
      // Até medir a largura, evita mostrar fileiras com a contagem errada.
      className={`space-y-14 transition-opacity duration-200 ${columns === null ? "opacity-0" : "opacity-100"}`}
    >
      {rows.map((row, i) => (
        <div key={i}>
          <ul
            className="grid items-end px-3 sm:px-6"
            style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`, columnGap: GAP }}
          >
            {row.map((book) => (
              <li key={book.id} className="relative">
                <BookCard book={book} variant="shelf" showStatus />
                {/* sombra de contato do livro sobre o tampo */}
                <span
                  aria-hidden
                  className="absolute inset-x-[6%] -bottom-1 h-2 rounded-[50%] bg-[#3A2A1C]/30 blur-[3px]"
                />
              </li>
            ))}
          </ul>
          <Plank />
        </div>
      ))}
    </div>
  );
}
