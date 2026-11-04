import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye } from "lucide-react";
import { Avatar } from "@/components/community/Avatar";
import { MemberShelf } from "@/components/community/MemberShelf";
import { ReviewPost } from "@/components/community/ReviewPost";
import { LibraryFilters } from "@/components/gallery/LibraryFilters";
import { findCategory } from "@/lib/books/categories";
import { applyGalleryFilters, galleryHref, parseGalleryFilters } from "@/lib/books/gallery";
import { getMemberShelf } from "@/lib/books/queries";

export default function LeitorPage({ params, searchParams }: PageProps<"/leitores/[userId]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-ink/5" aria-busy="true" />}>
      <Leitor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Leitor({ params, searchParams }: PageProps<"/leitores/[userId]">) {
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  const member = await getMemberShelf(userId);
  if (!member) notFound();

  // Mesmos filtros da página Livros (estado, categoria, ordem e busca na URL).
  // "Recentes" é a ordem de chegada na estante, como vem do banco.
  const filters = parseGalleryFilters(query, `/leitores/${member.id}`);
  const view = applyGalleryFilters(member.books, filters, (books) => books);
  const filtered = Boolean(filters.query || filters.category);
  const category = findCategory(filters.category)?.label;
  const reviews = member.books.filter((b) => b.review);

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

      <section aria-label="Estante" className="space-y-6">
        {member.books.length === 0 ? (
          <p className="rounded-[2rem] bg-paper-soft px-8 py-12 text-center text-graphite">Nada por aqui ainda.</p>
        ) : (
          <>
            <LibraryFilters filters={filters} view={view} title="Estante" member />
            {filtered && (
              <p className="text-sm text-graphite">
                {view.books.length} {view.books.length === 1 ? "livro" : "livros"}
                {category && (
                  <>
                    {" "}
                    em <b className="text-ink">{category}</b>
                  </>
                )}
                {filters.query && <> para “{filters.query}”</>}
              </p>
            )}
            {view.books.length > 0 ? (
              <MemberShelf books={view.books} />
            ) : (
              <div className="rounded-[2rem] bg-paper-soft px-8 py-12 text-center">
                <p className="text-graphite">{filtered ? "Nenhum livro com esses filtros." : "Nada por aqui ainda."}</p>
                {filtered && (
                  <Link
                    href={galleryHref(filters, { q: null, categoria: null })}
                    className="mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/30 hover:bg-white"
                  >
                    Limpar busca e categoria
                  </Link>
                )}
              </div>
            )}
          </>
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
