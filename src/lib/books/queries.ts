import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { BOOKS_BUCKET, type Book, type BookCard, type BookDetail } from "@/types/book";
import { settingsFromRow, type ReaderSettings } from "@/types/reader";

const SIGNED_URL_TTL = 60 * 60; // 1h

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Assina várias capas numa única chamada ao Storage (evita N+1). */
async function signPaths(supabase: ServerClient, paths: (string | null)[]) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map<string, string>();
  const { data } = await supabase.storage
    .from(BOOKS_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);
  return new Map((data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl]] : [])));
}

/** Livros do usuário para a galeria (com nota e resenha), mais recentes primeiro. */
export async function listBookCards(): Promise<BookCard[]> {
  const supabase = await createClient();

  const { data: books, error } = await supabase
    .from("books")
    .select(
      "id, title, author, status, progress, processing_status, page_count, word_count, last_read_at, created_at, started_at, finished_at, cover_path, reviews(rating, content)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  const urlByPath = await signPaths(supabase, books.map((b) => b.cover_path));

  return books.map(({ cover_path, reviews, ...book }) => {
    // A resenha é 1:1 com o livro; o PostgREST pode devolver objeto ou lista.
    const review = Array.isArray(reviews) ? reviews[0] : reviews;
    return {
      ...book,
      coverUrl: cover_path ? (urlByPath.get(cover_path) ?? null) : null,
      rating: review?.rating ?? null,
      review: review?.content.trim() || null,
    };
  });
}

export interface UserProfile {
  /** Nome escolhido pelo usuário (profiles.display_name), se houver. */
  displayName: string | null;
  /** Nome para exibir: o escolhido ou, sem ele, a parte local do e-mail. */
  name: string | null;
  email: string | null;
}

/** Memoizado por requisição: o cabeçalho e o início pedem o perfil na mesma página. */
export const getUserProfile = cache(async (): Promise<UserProfile> => {
  const supabase = await createClient();
  const [{ data: auth }, { data: profile }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("profiles").select("display_name").maybeSingle(),
  ]);

  const email = typeof auth?.claims.email === "string" ? auth.claims.email : null;
  const displayName = profile?.display_name?.trim() || null;
  if (displayName) return { displayName, name: displayName, email };

  const local = email?.split("@")[0].split(/[._-]/)[0];
  const fromEmail = local ? local.charAt(0).toUpperCase() + local.slice(1) : null;
  return { displayName: null, name: fromEmail, email };
});

/** Nome para a saudação. */
export async function getUserName(): Promise<string | null> {
  return (await getUserProfile()).name;
}

export async function getBookDetail(bookId: string): Promise<BookDetail | null> {
  const supabase = await createClient();

  const [{ data: book }, { data: review }] = await Promise.all([
    supabase.from("books").select("*").eq("id", bookId).maybeSingle(),
    supabase.from("reviews").select("*").eq("book_id", bookId).maybeSingle(),
  ]);
  if (!book) return null;

  const bucket = supabase.storage.from(BOOKS_BUCKET);
  const [covers, pdf] = await Promise.all([
    signPaths(supabase, [book.cover_path]),
    bucket.createSignedUrl(book.pdf_path, SIGNED_URL_TTL, { download: `${book.title}.pdf` }),
  ]);

  return {
    book,
    coverUrl: book.cover_path ? (covers.get(book.cover_path) ?? null) : null,
    pdfUrl: pdf.data?.signedUrl ?? null,
    review,
  };
}

export interface ReaderData {
  book: Book;
  settings: ReaderSettings;
  /** Signed URL do texto limpo; o Client Component baixa direto do Storage. */
  contentUrl: string | null;
}

export async function getReaderData(bookId: string): Promise<ReaderData | null> {
  const supabase = await createClient();

  const [{ data: book }, { data: prefs }] = await Promise.all([
    supabase.from("books").select("*").eq("id", bookId).maybeSingle(),
    supabase.from("reading_preferences").select("*").maybeSingle(),
  ]);
  if (!book) return null;

  let contentUrl: string | null = null;
  if (book.content_path) {
    const { data } = await supabase.storage
      .from(BOOKS_BUCKET)
      .createSignedUrl(book.content_path, SIGNED_URL_TTL);
    contentUrl = data?.signedUrl ?? null;
  }

  return { book, settings: settingsFromRow(prefs), contentUrl };
}
