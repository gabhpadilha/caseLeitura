import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  BOOKS_BUCKET,
  bookFolder,
  type Book,
  type BookCard,
  type BookDetail,
  type BookKind,
} from "@/types/book";
import { settingsFromRow, type ReaderSettings } from "@/types/reader";

const SIGNED_URL_TTL = 60 * 60; // 1h
// As ilustrações carregam aos poucos, conforme a leitura avança: precisam durar a sessão toda.
const IMAGE_URL_TTL = 60 * 60 * 12;

/** Linha de CARD_COLUMNS (sem `categories` antes da migration). */
type BookCardRow = Omit<BookCard, "coverUrl" | "rating" | "review" | "categories"> & {
  categories?: string[];
  cover_path: string | null;
  reviews: { rating: number | null; content: string } | { rating: number | null; content: string }[] | null;
};

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

const CARD_COLUMNS =
  "id, title, author, status, progress, processing_status, page_count, word_count, last_read_at, created_at, started_at, finished_at, categories, cover_path, reviews(rating, content)";
const LEGACY_CARD_COLUMNS = CARD_COLUMNS.replace("categories, ", "");

/** Coluna inexistente: o banco ainda não recebeu uma migration (quadrinhos, categorias). */
const UNDEFINED_COLUMN = "42703";

/**
 * Itens do usuário para a galeria (com nota e resenha), mais recentes primeiro:
 * livros para a estante, quadrinhos para a banca.
 */
export async function listBookCards(kind: BookKind = "book"): Promise<BookCard[]> {
  const supabase = await createClient();

  const query = (columns: string, byKind = true) => {
    const q = supabase.from("books").select(columns).order("created_at", { ascending: false });
    return (byKind ? q.eq("kind", kind) : q).overrideTypes<BookCardRow[], { merge: false }>();
  };
  let { data: books, error } = await query(CARD_COLUMNS);
  // Antes da migration das categorias: sem a coluna, nenhum livro tem categoria.
  if (error?.code === UNDEFINED_COLUMN) ({ data: books, error } = await query(LEGACY_CARD_COLUMNS));
  // Antes da migration dos quadrinhos (sem a coluna `kind`) tudo é livro.
  if (error?.code === UNDEFINED_COLUMN) {
    if (kind === "comic") return [];
    ({ data: books, error } = await query(LEGACY_CARD_COLUMNS, false));
  }
  if (error) throw error;
  if (!books) return [];

  const urlByPath = await signPaths(supabase, books.map((b) => b.cover_path));

  return books.map(({ cover_path, reviews, categories, ...book }) => {
    // A resenha é 1:1 com o livro; o PostgREST pode devolver objeto ou lista.
    const review = Array.isArray(reviews) ? reviews[0] : reviews;
    return {
      ...book,
      categories: categories ?? [],
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

  // Login com Google: o nome vem em user_metadata (full_name/name); usa o primeiro nome.
  const meta = (auth?.claims.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = [meta.display_name, meta.full_name, meta.name].find(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  if (fullName) return { displayName: null, name: fullName.trim().split(/\s+/)[0], email };

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
    bucket.createSignedUrl(book.pdf_path, SIGNED_URL_TTL, {
      download: `${book.title}.${book.pdf_path.split(".").pop() ?? "pdf"}`,
    }),
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
  /** Signed URLs das ilustrações, pelo nome do arquivo (como aparece no texto). */
  imageUrls: Record<string, string>;
}

export async function getReaderData(bookId: string): Promise<ReaderData | null> {
  const supabase = await createClient();

  const [{ data: book }, { data: prefs }] = await Promise.all([
    supabase.from("books").select("*").eq("id", bookId).maybeSingle(),
    supabase.from("reading_preferences").select("*").maybeSingle(),
  ]);
  if (!book) return null;

  if (!book.content_path) {
    return { book, settings: settingsFromRow(prefs), contentUrl: null, imageUrls: {} };
  }

  const bucket = supabase.storage.from(BOOKS_BUCKET);
  const imagesFolder = `${bookFolder(book.content_path)}/images`;
  const [{ data: content }, { data: files }] = await Promise.all([
    bucket.createSignedUrl(book.content_path, SIGNED_URL_TTL),
    bucket.list(imagesFolder, { limit: 1000 }),
  ]);

  // Todas as ilustrações assinadas numa chamada só.
  const names = (files ?? []).filter((f) => f.id).map((f) => f.name);
  const imageUrls: Record<string, string> = {};
  if (names.length) {
    const { data: signed } = await bucket.createSignedUrls(
      names.map((name) => `${imagesFolder}/${name}`),
      IMAGE_URL_TTL,
    );
    signed?.forEach((s, i) => {
      if (s.signedUrl) imageUrls[names[i]] = s.signedUrl;
    });
  }

  return {
    book,
    settings: settingsFromRow(prefs),
    contentUrl: content?.signedUrl ?? null,
    imageUrls,
  };
}

/** Signed URLs das páginas de um quadrinho, na ordem. */
export async function getComicPages(book: Pick<Book, "pdf_path">): Promise<string[]> {
  const supabase = await createClient();
  const bucket = supabase.storage.from(BOOKS_BUCKET);
  const folder = `${bookFolder(book.pdf_path)}/pages`;

  const { data: files } = await bucket.list(folder, {
    limit: 2000,
    sortBy: { column: "name", order: "asc" },
  });
  const names = (files ?? [])
    .filter((f) => f.id)
    .map((f) => f.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  if (names.length === 0) return [];

  const { data: signed } = await bucket.createSignedUrls(
    names.map((name) => `${folder}/${name}`),
    IMAGE_URL_TTL,
  );
  return (signed ?? []).flatMap((s) => (s.signedUrl ? [s.signedUrl] : []));
}

// ---------------------------------------------------------------------------
// Comunidade: o que os outros veem. Tudo passa pelas funções do banco
// (timeline, member_books), que só devolvem os campos públicos.
// ---------------------------------------------------------------------------

/** Nome para quem ainda não escolheu um (o e-mail dos outros nunca é exposto). */
export const UNNAMED_READER = "Leitor sem nome";

async function currentUserId(supabase: ServerClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return typeof data?.claims.sub === "string" ? data.claims.sub : null;
}

export interface TimelinePost {
  reviewId: string;
  userId: string;
  userName: string;
  bookTitle: string;
  bookAuthor: string | null;
  bookId: string;
  coverUrl: string | null;
  rating: number | null;
  content: string;
  spoiler: boolean;
  sharedAt: string;
  /** Post de quem está vendo (leva à página do livro, não à estante pública). */
  mine: boolean;
}

export const TIMELINE_PAGE = 20;

/** Uma página da timeline, mais recentes primeiro. `before` = sharedAt do último post já visto. */
export async function getTimeline(
  before: string | null = null,
): Promise<{ posts: TimelinePost[]; nextBefore: string | null }> {
  const supabase = await createClient();
  const [{ data, error }, me] = await Promise.all([
    supabase.rpc("timeline", { p_before: before, p_limit: TIMELINE_PAGE }),
    currentUserId(supabase),
  ]);
  if (error) throw error;
  const rows = data ?? [];
  const urlByPath = await signPaths(supabase, rows.map((r) => r.cover_path));

  const posts = rows.map((r) => ({
    reviewId: r.review_id,
    userId: r.user_id,
    userName: r.user_name?.trim() || UNNAMED_READER,
    bookId: r.book_id,
    bookTitle: r.book_title,
    bookAuthor: r.book_author,
    coverUrl: r.cover_path ? (urlByPath.get(r.cover_path) ?? null) : null,
    rating: r.rating,
    content: r.content,
    spoiler: r.spoiler,
    sharedAt: r.shared_at,
    mine: r.user_id === me,
  }));
  return { posts, nextBefore: posts.length === TIMELINE_PAGE ? posts[posts.length - 1].sharedAt : null };
}

export interface MemberBook {
  id: string;
  title: string;
  author: string | null;
  status: Book["status"];
  kind: BookKind;
  categories: string[];
  coverUrl: string | null;
  createdAt: string;
  finishedAt: string | null;
  /** Nota e resenha só quando o dono compartilhou. */
  rating: number | null;
  review: string | null;
  spoiler: boolean;
}

export interface Member {
  id: string;
  name: string;
  isMe: boolean;
}

async function memberBooks(supabase: ServerClient, userId: string): Promise<MemberBook[]> {
  const { data, error } = await supabase.rpc("member_books", { p_user: userId });
  if (error) throw error;
  const rows = data ?? [];
  const urlByPath = await signPaths(supabase, rows.map((r) => r.cover_path));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    status: r.status,
    kind: r.kind,
    categories: r.categories ?? [],
    coverUrl: r.cover_path ? (urlByPath.get(r.cover_path) ?? null) : null,
    createdAt: r.created_at,
    finishedAt: r.finished_at,
    rating: r.rating,
    review: r.review?.trim() || null,
    spoiler: Boolean(r.spoiler),
  }));
}

/** Todos os leitores do app, com a estante pública de cada um (para a página Leitores). */
export async function listMembers(): Promise<(Member & { books: MemberBook[] })[]> {
  const supabase = await createClient();
  const [{ data: profiles, error }, me] = await Promise.all([
    supabase.from("profiles").select("id, display_name").order("created_at"),
    currentUserId(supabase),
  ]);
  if (error) throw error;
  const members = await Promise.all(
    (profiles ?? []).map(async (p) => ({
      id: p.id,
      name: p.display_name?.trim() || UNNAMED_READER,
      isMe: p.id === me,
      books: await memberBooks(supabase, p.id),
    })),
  );
  // Você primeiro; depois os outros, na ordem de chegada.
  return members.sort((a, b) => Number(b.isMe) - Number(a.isMe));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Estante pública de um leitor; null se o id não existe. */
export async function getMemberShelf(userId: string): Promise<(Member & { books: MemberBook[] }) | null> {
  if (!UUID.test(userId)) return null;
  const supabase = await createClient();
  const [{ data: profile }, me] = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("id", userId).maybeSingle(),
    currentUserId(supabase),
  ]);
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.display_name?.trim() || UNNAMED_READER,
    isMe: profile.id === me,
    books: await memberBooks(supabase, profile.id),
  };
}
