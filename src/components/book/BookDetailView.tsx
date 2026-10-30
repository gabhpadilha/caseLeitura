import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, Download, Star, TriangleAlert } from "lucide-react";
import { BookCover } from "@/components/gallery/BookCover";
import { StatusBadge } from "@/components/gallery/StatusBadge";
import { formatDate, formatPercent, readingDuration, readingTime } from "@/lib/books/format";
import type { BookDetail } from "@/types/book";
import { DeleteBookButton } from "./DeleteBookButton";
import { EditBookButton } from "./EditBookButton";
import { ReprocessButton } from "./ReprocessButton";
import { ReviewCard } from "./ReviewCard";
import { StatusPicker } from "./StatusPicker";

interface BookDetailViewProps {
  data: BookDetail;
}

const circleButton =
  "flex size-12 items-center justify-center rounded-full bg-paper-soft ring-1 ring-ink/10 transition-colors hover:bg-white";

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-paper-soft px-3.5 py-1 text-sm text-graphite">{children}</span>;
}

/** Página do livro: capa grande, ação principal, nota, resenha e detalhes. */
export function BookDetailView({ data }: BookDetailViewProps) {
  const { book, coverUrl, pdfUrl, review } = data;
  const readable = book.processing_status === "ready";
  const started = book.progress > 0;
  const finished = book.status === "finished";
  const rating = review?.rating ?? null;

  const action = finished ? "Reler" : started ? `Continuar lendo · ${formatPercent(book.progress)}` : "Começar a ler";

  const details = [
    { label: "Progresso", value: started ? formatPercent(book.progress) : "Não iniciado" },
    { label: "Páginas no PDF", value: book.page_count?.toLocaleString("pt-BR") },
    { label: "Palavras", value: book.word_count?.toLocaleString("pt-BR") },
    { label: "Tempo de leitura", value: readingTime(book.word_count) && `≈ ${readingTime(book.word_count)}` },
    { label: "Começou em", value: formatDate(book.started_at) },
    { label: "Terminou em", value: formatDate(book.finished_at) },
    { label: "Última leitura", value: formatDate(book.last_read_at) },
    { label: "Adicionado em", value: formatDate(book.created_at) },
  ].filter((d): d is { label: string; value: string } => Boolean(d.value));

  const finishedLabel = formatDate(book.finished_at);
  const duration = readingDuration(book.started_at, book.finished_at);

  return (
    <article>
      <Link
        href="/"
        className="inline-flex items-center gap-1 font-semibold text-coral-dark hover:underline"
      >
        <ChevronLeft className="size-5" aria-hidden /> Minha estante
      </Link>

      <header className="mt-10 grid gap-10 md:grid-cols-[auto_1fr] md:items-center lg:gap-16">
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={coverUrl}
          seed={book.id}
          size="lg"
          className="mx-auto w-52 shadow-[0_34px_44px_-20px_rgba(36,35,43,0.6)] md:mx-0 lg:w-72"
        />
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={book.status} />
            {book.page_count && <Chip>PDF · {book.page_count} páginas</Chip>}
            {finished && finishedLabel && <Chip>Terminado em {finishedLabel}</Chip>}
            {finished && duration && <Chip>{duration}</Chip>}
          </div>

          <h1 className="mt-5 font-display text-5xl leading-[1.02] font-medium lg:text-7xl">{book.title}</h1>
          {book.author && <p className="mt-4 text-lg font-semibold">{book.author}</p>}
          {book.description && <p className="mt-4 max-w-xl text-graphite italic">{book.description}</p>}

          <div className="mt-5 flex items-center gap-3">
            <span className="flex gap-1" role="img" aria-label={rating ? `Minha nota: ${rating} de 5` : "Sem nota"}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`size-6 text-coral ${rating && n <= rating ? "fill-coral" : "opacity-30"}`}
                  aria-hidden
                />
              ))}
            </span>
            {rating ? (
              <span className="text-graphite">Minha nota</span>
            ) : (
              <a href="#resenha" className="text-sm font-semibold text-coral-dark hover:underline">
                Dar nota
              </a>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {readable ? (
              <Link
                href={`/leitor/${book.id}`}
                className="inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-3.5 font-medium text-paper transition-colors hover:bg-ink/85"
              >
                {action}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <p className="flex items-center gap-2 rounded-full bg-coral-soft px-4 py-2.5 text-sm text-coral-dark">
                <TriangleAlert className="size-4" aria-hidden />
                Ainda sem texto. Reprocesse para ler as páginas escaneadas.
              </p>
            )}
            {pdfUrl && (
              <a href={pdfUrl} title="Baixar PDF original" aria-label="Baixar PDF original" className={circleButton}>
                <Download className="size-[1.15rem]" aria-hidden />
              </a>
            )}
            <EditBookButton book={book} className={circleButton} />
            <DeleteBookButton book={book} className={`${circleButton} hover:text-coral-dark`} />
          </div>

          <div className="mt-6">
            <StatusPicker bookId={book.id} status={book.status} startedAt={book.started_at} />
          </div>
        </div>
      </header>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
        <ReviewCard bookId={book.id} review={review} />

        <section aria-labelledby="detalhes">
          <h2 id="detalhes" className="mb-6 font-display text-3xl font-medium sm:text-4xl">
            Detalhes
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
            {details.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-graphite">{label}</dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8">
            <ReprocessButton book={book} />
          </div>
        </section>
      </div>
    </article>
  );
}
