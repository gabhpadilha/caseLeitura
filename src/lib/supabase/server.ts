import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/types/database";
import { supabaseEnv } from "./env";

/**
 * Cliente para Server Components, Server Actions e Route Handlers.
 * Crie um por requisição — nunca compartilhe entre requisições.
 */
export async function createClient() {
  const cookieStore = await cookies();
  // Com Partial Prefetching, o Next pré-renderiza uma "casca" que já enxerga os
  // cookies. O supabase-js consulta o relógio (Date.now) ao validar a sessão, o
  // que o Next recusa nessa etapa. connection() adia tudo para a requisição real.
  await connection();
  // Só depois de connection(): no build (pré-render) o código para acima, então
  // a falta das variáveis vira erro na requisição, não um build quebrado.
  const { url, publishableKey } = supabaseEnv();

  return createServerClient<Database>(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components não podem gravar cookies; o proxy.ts renova a sessão.
          }
        },
      },
    },
  );
}
