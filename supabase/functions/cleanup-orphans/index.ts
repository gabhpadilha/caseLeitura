// Edge Function: cleanup-orphans
// Remove do bucket privado "books" as sobras que ficam para trás:
//   1. pastas de usuários que não existem mais em auth.users;
//   2. pastas de livros sem linha correspondente em public.books (mesmo id e
//      user_id), desde que TODOS os arquivos tenham mais de 24 h.
// Nunca apaga nada com menos de 24 h (um upload em andamento ainda não tem linha).
//
// Autenticação: header `x-cleanup-secret` == segredo CLEANUP_SECRET (deploy com
// --no-verify-jwt). SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados pelo
// Supabase. A service role NUNCA é logada nem devolvida.
//
// Uso: GET/POST ...?dry=1  → só relata. ?max=N → limite de arquivos (padrão e teto 500).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const BUCKET = "books";
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const HARD_MAX_REMOVALS = 500;
const BATCH = 100;
const PAGE = 100;
const TIME_BUDGET_MS = 50_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Entry = { name: string; id: string | null; created_at?: string | null; updated_at?: string | null; metadata?: { size?: number } | null };
type FileInfo = { path: string; size: number; ts: number | null };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Comparação em tempo constante: compara os SHA-256 dos dois valores.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CLEANUP_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !url || !serviceKey) return json({ error: "configuração incompleta" }, 500);

  const given = req.headers.get("x-cleanup-secret");
  if (!given || !(await safeEqual(given, secret))) return json({ error: "não autorizado" }, 401);

  const params = new URL(req.url).searchParams;
  const dry = params.get("dry") === "1";
  const maxReq = Number.parseInt(params.get("max") ?? "", 10);
  const maxRemovals = Number.isFinite(maxReq) && maxReq > 0 ? Math.min(maxReq, HARD_MAX_REMOVALS) : HARD_MAX_REMOVALS;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const storage = admin.storage.from(BUCKET);
  const started = Date.now();
  const outOfTime = () => Date.now() - started > TIME_BUDGET_MS;

  const errors: string[] = [];
  const orphanUsers: string[] = [];
  const orphanBooks: string[] = [];
  const toRemove: string[] = [];
  const sizes = new Map<string, number>();
  let truncated = false;

  // Lista tudo dentro de um prefixo, com paginação.
  async function listAll(prefix: string): Promise<Entry[]> {
    const out: Entry[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await storage.list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(`list falhou (${prefix.slice(0, 8)}…): ${error.message}`);
      out.push(...(data as Entry[]));
      if (!data || data.length < PAGE) break;
    }
    return out;
  }

  // Todos os arquivos sob um prefixo, recursivamente (images/, pages/, ...).
  async function walk(prefix: string, acc: FileInfo[] = []): Promise<FileInfo[]> {
    for (const e of await listAll(prefix)) {
      const path = `${prefix}/${e.name}`;
      if (e.id === null) {
        await walk(path, acc);
      } else {
        const t = Date.parse(e.updated_at ?? e.created_at ?? "");
        acc.push({ path, size: Number(e.metadata?.size ?? 0) || 0, ts: Number.isNaN(t) ? null : t });
      }
    }
    return acc;
  }

  // Enfileira arquivos respeitando o limite por execução.
  function enqueue(files: FileInfo[]): boolean {
    for (const f of files) {
      if (toRemove.length >= maxRemovals) { truncated = true; return false; }
      toRemove.push(f.path);
      sizes.set(f.path, f.size);
    }
    return true;
  }

  try {
    const userFolders = (await listAll("")).filter((e) => e.id === null && UUID_RE.test(e.name)).map((e) => e.name);

    for (const userId of userFolders) {
      if (toRemove.length >= maxRemovals || outOfTime()) { truncated = true; break; }

      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) {
        const notFound = error.status === 404 || (error as { code?: string }).code === "user_not_found";
        if (!notFound) { errors.push(`getUserById falhou (${userId.slice(0, 8)}…)`); continue; }
      } else if (data?.user) {
        // Usuário existe: procura livros órfãos.
        const bookFolders = (await listAll(userId)).filter((e) => e.id === null && UUID_RE.test(e.name)).map((e) => e.name);
        if (bookFolders.length === 0) continue;

        const { data: rows, error: dbErr } = await admin.from("books").select("id").eq("user_id", userId).in("id", bookFolders);
        if (dbErr) { errors.push(`consulta a books falhou (${userId.slice(0, 8)}…)`); continue; }
        const known = new Set((rows ?? []).map((r: { id: string }) => r.id));

        for (const bookId of bookFolders) {
          if (known.has(bookId)) continue;
          if (toRemove.length >= maxRemovals || outOfTime()) { truncated = true; break; }
          const files = await walk(`${userId}/${bookId}`);
          if (files.length === 0) continue;
          // Qualquer arquivo recente (ou sem data) protege a pasta inteira.
          const now = Date.now();
          if (files.some((f) => f.ts === null || now - f.ts < MIN_AGE_MS)) continue;
          orphanBooks.push(`${userId.slice(0, 8)}/${bookId}`);
          enqueue(files);
        }
        continue;
      } else {
        continue; // resposta inesperada: não apaga
      }

      // Usuário inexistente: apaga tudo da pasta dele (também respeitando as 24 h por arquivo).
      const now = Date.now();
      const old = (await walk(userId)).filter((f) => f.ts !== null && now - f.ts >= MIN_AGE_MS);
      if (old.length === 0) continue;
      orphanUsers.push(userId.slice(0, 8));
      enqueue(old);
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "erro inesperado");
  }

  let removed = 0;
  let bytes = 0;
  if (dry) {
    for (const p of toRemove) bytes += sizes.get(p) ?? 0;
  } else {
    for (let i = 0; i < toRemove.length; i += BATCH) {
      const batch = toRemove.slice(i, i + BATCH);
      const { data, error } = await storage.remove(batch);
      if (error) { errors.push(`remoção do lote ${i / BATCH + 1} falhou: ${error.message}`); continue; }
      const done = new Set((data ?? []).map((o: { name: string }) => o.name));
      for (const p of batch) if (done.has(p)) { removed++; bytes += sizes.get(p) ?? 0; }
    }
  }

  return json({
    dry,
    removed,
    ...(dry ? { removeria: toRemove.length } : {}),
    bytes_estimados: bytes,
    usuarios_orfaos: orphanUsers,
    livros_orfaos: orphanBooks,
    truncado: truncated,
    erros: errors,
  });
});
