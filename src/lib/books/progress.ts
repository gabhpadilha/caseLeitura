// Gravação do progresso de leitura (browser).
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";
import type { BookUpdate, ReadingStatus } from "@/types/book";

/** Data local (AAAA-MM-DD), não UTC: à noite no Brasil o UTC já é o dia seguinte. */
function today() {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * Atualização do livro para a fração lida. Na primeira leitura de um livro da
 * fila, também o move para "Lendo" e registra a data de início.
 */
export function progressPatch(
  fraction: number,
  status: ReadingStatus,
  startedAt: string | null,
): BookUpdate {
  return {
    progress: Math.round(fraction * 10000) / 100,
    last_read_at: new Date().toISOString(),
    ...(status === "to_read"
      ? { status: "reading" as const, ...(startedAt ? {} : { started_at: today() }) }
      : {}),
  };
}

/**
 * Grava pelo cliente do Supabase. Atenção: as consultas do supabase-js são
 * preguiçosas — só são enviadas quando aguardadas (`await`/`.then`). Um
 * `void supabase.from(...).update(...)` nunca sai do navegador.
 */
export async function saveProgress(
  supabase: SupabaseClient<Database>,
  bookId: string,
  patch: BookUpdate,
): Promise<void> {
  const { error } = await supabase.from("books").update(patch).eq("id", bookId);
  if (error) throw error;
}

/**
 * Envio "de saída": chamado ao fechar/trocar de app ou sair do leitor, quando
 * não dá mais para esperar resposta. `fetch` com `keepalive` continua mesmo
 * depois que a página é descartada (corpo pequeno, bem abaixo do limite de 64 KB).
 * Usa o token da sessão que o cliente principal mantém, sem criar outro cliente
 * de autenticação (dois clientes renovando o token podem derrubar a sessão).
 */
export function sendProgressOnExit(bookId: string, patch: BookUpdate, accessToken: string): void {
  const { url, publishableKey } = supabaseEnv();
  // fetch nativo é imediato (diferente do supabase-js): o void aqui é seguro.
  void fetch(`${url}/rest/v1/books?id=eq.${encodeURIComponent(bookId)}`, {
    method: "PATCH",
    keepalive: true,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  }).catch(() => {
    // Sem rede ao sair: o progresso anterior (salvo durante a leitura) permanece.
  });
}
