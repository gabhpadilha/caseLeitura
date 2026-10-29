import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Link do e-mail de confirmação. Aceita os dois formatos:
 * - modelo do caseLeitura (supabase/templates/confirm-signup.html):
 *   ?token_hash=…&type=email → valida o token e já entra na conta;
 * - modelo padrão do Supabase: o Supabase confirma o e-mail e volta com ?code=…
 *   (PKCE). Se o código não puder virar sessão (e-mail aberto em outro aparelho),
 *   o e-mail já está confirmado: só falta entrar.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  } else if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    redirect(error ? "/login?aviso=confirmado" : next);
  }

  // Link expirado, já usado ou incompleto: a tela de login explica e oferece reenviar.
  redirect("/login?erro=link");
}
