import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, Users } from "lucide-react";
import { ReviewPost } from "@/components/community/ReviewPost";
import { getTimeline } from "@/lib/books/queries";

export const metadata: Metadata = { title: "Timeline · caseLeitura" };

export default function TimelinePage({ searchParams }: PageProps<"/timeline">) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-4xl font-medium sm:text-5xl">Timeline</h1>
        <p className="mt-2 text-graphite">O que a turma anda lendo, pelas resenhas que cada um compartilhou.</p>
      </header>
      <Suspense fallback={<TimelineSkeleton />}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Carregando a timeline">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-64 rounded-[2rem] bg-ink/5" />
      ))}
    </div>
  );
}

// Paginação por cursor: ?antes=<data do último post visto>.
async function Feed({ searchParams }: Pick<PageProps<"/timeline">, "searchParams">) {
  const { antes } = await searchParams;
  const before = typeof antes === "string" && !Number.isNaN(Date.parse(antes)) ? antes : null;
  const { posts, nextBefore } = await getTimeline(before);

  if (posts.length === 0) {
    return (
      <div className="rounded-[2rem] bg-paper-soft px-8 py-14 text-center">
        <Users className="mx-auto size-9 text-coral" strokeWidth={1.6} aria-hidden />
        <p className="mx-auto mt-4 max-w-sm text-graphite">
          {before
            ? "Não há posts mais antigos."
            : "Ninguém compartilhou uma resenha ainda. Abra um livro que você leu, escreva o que achou e ligue “Compartilhar na timeline”."}
        </p>
        {before && (
          <Link href="/timeline" className="mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/30 hover:bg-white">
            Voltar ao começo
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {before && (
        <Link href="/timeline" className="block text-center text-sm font-semibold text-coral-dark hover:underline">
          Voltar aos mais recentes
        </Link>
      )}
      {posts.map((post) => (
        <ReviewPost
          key={post.reviewId}
          author={{ id: post.userId, name: post.userName, mine: post.mine }}
          book={{ id: post.bookId, title: post.bookTitle, author: post.bookAuthor, coverUrl: post.coverUrl }}
          rating={post.rating}
          content={post.content}
          spoiler={post.spoiler}
          sharedAt={post.sharedAt}
          comments={{ href: `/resenha/${post.reviewId}`, count: post.commentCount }}
        />
      ))}
      {nextBefore && (
        <Link
          href={`/timeline?antes=${encodeURIComponent(nextBefore)}`}
          className="mx-auto flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/30 hover:bg-white"
        >
          <ArrowDown className="size-4" aria-hidden />
          Ver posts mais antigos
        </Link>
      )}
    </div>
  );
}
