import { Suspense } from "react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Avatar } from "@/components/community/Avatar";
import { BookCover } from "@/components/gallery/BookCover";
import { matchesName } from "@/lib/books/format";
import { listMembers, type MemberBook } from "@/lib/books/queries";

export const metadata: Metadata = { title: "Leitores · caseLeitura" };

export default function LeitoresPage({ searchParams }: PageProps<"/leitores">) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-4xl font-medium sm:text-5xl">Leitores</h1>
        <p className="mt-2 text-graphite">A estante de cada um: o que está lendo, o que já leu e o que vem por aí.</p>
      </header>
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando leitores">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 rounded-[2rem] bg-ink/5" />
            ))}
          </div>
        }
      >
        <Members searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function count(books: MemberBook[], status: MemberBook["status"]) {
  return books.filter((b) => b.status === status).length;
}

async function Members({ searchParams }: Pick<PageProps<"/leitores">, "searchParams">) {
  const [params, all] = await Promise.all([searchParams, listMembers()]);
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const members = query ? all.filter((m) => matchesName(m.name, query)) : all;

  return (
    <div className="space-y-6">
      <Form action="/leitores" role="search" className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-graphite"
          aria-hidden
        />
        <input
          key={query}
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Buscar leitor pelo nome"
          aria-label="Buscar leitores"
          className="w-full rounded-full bg-paper-soft py-3 pr-4 pl-11 text-sm ring-1 ring-ink/10 outline-none placeholder:text-graphite/80 focus:ring-2 focus:ring-coral"
        />
      </Form>

      {members.length === 0 && (
        <div className="rounded-[2rem] bg-paper-soft px-8 py-14 text-center">
          <p className="text-graphite">Nenhum leitor com “{query}”.</p>
          <Link
            href="/leitores"
            className="mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/30 hover:bg-white"
          >
            Ver todos
          </Link>
        </div>
      )}

      <ul className="space-y-4">
        {members.map((m) => {
          const reading = m.books.filter((b) => b.status === "reading");
          // Na vitrine: o que está lendo; sem leitura em andamento, os mais recentes.
          const showcase = (reading.length ? reading : m.books).slice(0, 4);
          return (
            <li key={m.id}>
              <Link
                href={`/leitores/${m.id}`}
                className="flex items-center gap-4 rounded-[2rem] bg-paper-soft p-5 ring-1 ring-ink/5 transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(36,35,43,0.5)] sm:gap-6 sm:p-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} seed={m.id} className="size-12 text-xl" />
                    <div className="min-w-0">
                      <p className="truncate font-display text-2xl font-semibold">
                        {m.name}
                        {m.isMe && <span className="ml-2 font-sans text-sm font-medium text-graphite">(você)</span>}
                      </p>
                      <p className="text-sm text-graphite">
                        {count(m.books, "reading")} lendo · {count(m.books, "finished")} lidos ·{" "}
                        {count(m.books, "to_read")} na fila
                      </p>
                    </div>
                  </div>
                  {showcase.length > 0 && (
                    <div className="mt-4 flex items-end gap-3">
                      <span className="sr-only">{reading.length ? "Lendo agora:" : "Na estante:"}</span>
                      {showcase.map((b) => (
                        <BookCover
                          key={b.id}
                          title={b.title}
                          author={b.author}
                          coverUrl={b.coverUrl}
                          seed={b.id}
                          size="sm"
                          className="w-14 sm:w-16"
                        />
                      ))}
                      <span className="ml-1 self-center text-xs font-semibold text-graphite">
                        {reading.length ? "lendo agora" : "na estante"}
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight className="size-5 shrink-0 text-graphite" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
