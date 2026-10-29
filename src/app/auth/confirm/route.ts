import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Link do e-mail de confirmação (modelo em supabase/templates/confirm-signup.html):
 * /auth/confirm?token_hash=…&type=email. Valida o token, cria a sessão nos
 * cookies e leva a pessoa já logada para dentro do app.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(safeNext(searchParams.get("next")));
  }

  // Link expirado, já usado ou incompleto: a tela de login explica e oferece reenviar.
  redirect("/login?erro=link");
}
