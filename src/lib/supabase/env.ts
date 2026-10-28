// Acesso literal a process.env.NEXT_PUBLIC_*: o Next só embute no bundle do
// browser as variáveis escritas por extenso no código.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** URL e publishable key do projeto, com erro claro se o .env.local faltar. */
export function supabaseEnv(): { url: string; publishableKey: string } {
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis do Supabase ausentes: ${missing.join(", ")}. ` +
        "Copie .env.example para .env.local, preencha com os dados de " +
        "Supabase Dashboard → Project Settings → API Keys e reinicie o `npm run dev`.",
    );
  }
  return { url: url!, publishableKey: publishableKey! };
}
