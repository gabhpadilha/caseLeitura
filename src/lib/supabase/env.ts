// Acesso literal a process.env.NEXT_PUBLIC_*: o Next só embute no bundle do
// browser as variáveis escritas por extenso no código.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** URL e publishable key do projeto, com erro claro se as variáveis faltarem. */
export function supabaseEnv(): { url: string; publishableKey: string } {
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis do Supabase ausentes: ${missing.join(", ")}. ` +
        "Valores em Supabase Dashboard → Project Settings → API Keys. " +
        "Local: copie .env.example para .env.local e reinicie o `npm run dev`. " +
        "Vercel: cadastre em Settings → Environment Variables e faça um novo deploy " +
        "(variáveis NEXT_PUBLIC_* entram no código durante o build).",
    );
  }
  return { url: url!, publishableKey: publishableKey! };
}
