import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye } from "lucide-react";
import { Avatar } from "@/components/community/Avatar";
import { MemberShelf } from "@/components/community/MemberShelf";
import { ReviewPost } from "@/components/community/ReviewPost";
import { getMemberShelf } from "@/lib/books/queries";
import { SHELVES } from "@/types/book";

export default function LeitorPage({ params, searchParams }: PageProps<"/leitores/[userId]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-ink/5" aria-busy="true" />}>
      <Leitor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Leitor({ params, searchParams }: PageProps<"/leitores/[userId]">) {
  const [{ userId }, { estado }] = await Promise.all([params, searchParams]);
  const member = await getMemberShelf(userId);
  if (!member) notFound();

  const shelf = SHELVES.find((s) => s.slug === estado) ?? null;
  const books = shelf ? member.books.filter((b) => b.status === shelf.status) : member.books;
  const reviews = member.books.filter((b) => b.review);
  const tabs: { slug: string | null; label: string; count: number }[] = [
    { slug: null, label: "Todos", count: member.books.length },
    ...SHELVES.map((s) => ({
      slug: s.slug,
      label: s.short,
      count: member.books.filter((b) => b.status === s.status).length,
    })),
  ];

  return (
    <div className="space-y-10">
      <Link href="/leitores" className="inline-flex items-center gap-1 font-semibold text-coral-dark hover:underline">
        <ChevronLeft className="size-5" aria-hidden /> Leitores
      </Link>

      <header className="flex items-center gap-4">
        <Avatar name={member.name} seed={member.id} className="size-16 text-2xl" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-4xl font-medium sm:text-5xl">{member.name}</h1>
          <p className="text-graphite">
            {member.books.length} {member.books.length === 1 ? "livro" : "livros"} na estante
          </p>
        </div>
      </header>

      {member.isMe && (
        <p className="flex items-start gap-3 rounded-2xl bg-sage-soft px-4 py-3 text-sm text-[#2F5654]">
          <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
          É assim que os outros leitores veem a sua estante: capa, título, autor e estado. O conteúdo dos livros e
          as resenhas não compartilhadas ficam só com você.
        </p>
      )}

      <section aria-labelledby="estante" className="space-y-6">
        <h2 id="estante" className="sr-only">
          Estante
        </h2>
        <nav aria-label="Filtrar por estado" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const active = (shelf?.slug ?? null) === tab.slug;
            return (
              <Link
                key={tab.label}
                href={tab.slug ? `/leitores/${member.id}?estado=${tab.slug}` : `/leitores/${member.id}`}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-ink text-paper" : "bg-paper-soft ring-1 ring-ink/10 hover:ring-ink/30"
                }`}
              >
                {tab.label} <span className={active ? "text-paper/60" : "text-graphite"}>{tab.count}</span>
              </Link>
            );
          })}
        </nav>
        {books.length > 0 ? (
          <MemberShelf books={books} />
        ) : (
          <p className="rounded-[2rem] bg-paper-soft px-8 py-12 text-center text-graphite">Nada por aqui ainda.</p>
        )}
      </section>

      {reviews.length > 0 && (
        <section aria-labelledby="resenhas" className="space-y-6">
          <h2 id="resenhas" className="font-display text-3xl font-medium sm:text-4xl">
            Resenhas
          </h2>
          <div className="mx-auto max-w-2xl space-y-6">
            {reviews.map((b) => (
              <ReviewPost
                key={b.id}
                author={{ id: member.id, name: member.name, mine: member.isMe }}
                book={{ id: b.id, title: b.title, author: b.author, coverUrl: b.coverUrl }}
                rating={b.rating}
                content={b.review ?? ""}
                spoiler={b.spoiler}
                sharedAt={null}
                hideAuthor
                comments={b.reviewId ? { href: `/resenha/${b.reviewId}`, count: b.commentCount } : undefined}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
