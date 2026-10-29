"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { AUTH_NOTICE, authErrorMessage, isEmailNotConfirmed } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/client";

type Mode = "entrar" | "cadastrar";

// Login com Google só aparece depois de configurado (Google Cloud + Supabase):
// cadastre NEXT_PUBLIC_AUTH_GOOGLE=on na Vercel. Sem isso o botão daria erro.
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "on";

/** Espera entre reenvios do e-mail de confirmação (o Supabase também limita). */
const RESEND_COOLDOWN_S = 60;

const field =
  "w-full rounded-full bg-paper px-5 py-3 text-sm ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-coral";
const primary =
  "flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-60";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-[1.1rem]" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const notice = AUTH_NOTICE[useSearchParams().get("erro") ?? ""] ?? null;

  const [mode, setMode] = useState<Mode>("entrar");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(notice);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  // Depois do cadastro: "confira seu e-mail".
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const confirmUrl = () => `${window.location.origin}/auth/confirm`;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setUnconfirmedEmail(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const name = String(form.get("name") ?? "").trim();
    const supabase = createClient();

    setBusy(true);
    setError(null);
    setUnconfirmedEmail(null);

    if (mode === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        if (isEmailNotConfirmed(error.message)) setUnconfirmedEmail(email);
        return setError(authErrorMessage(error.message));
      }
      router.replace("/");
      router.refresh();
      return;
    }

    // Cadastro: o nome vai nos metadados e o gatilho do banco grava em profiles.display_name.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name }, emailRedirectTo: confirmUrl() },
    });
    setBusy(false);
    if (error) return setError(authErrorMessage(error.message));
    if (data.session) {
      // Confirmação de e-mail desligada no Supabase: já entra.
      router.replace("/");
      router.refresh();
      return;
    }
    setSentTo(email);
    setCooldown(RESEND_COOLDOWN_S);
  }

  async function resend(email: string) {
    setError(null);
    setResent(false);
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmUrl() },
    });
    if (error) return setError(authErrorMessage(error.message));
    setResent(true);
    setCooldown(RESEND_COOLDOWN_S);
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(authErrorMessage(error.message));
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-sage-soft text-[#2F5654]">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <h2 className="font-display text-3xl font-semibold">Confira seu e-mail</h2>
        <p className="text-sm leading-relaxed text-graphite">
          Enviamos um link de confirmação para <strong className="text-ink">{sentTo}</strong>. Abra o
          e-mail e toque em “Confirmar meu e-mail” para entrar na sua estante.
        </p>
        <p className="text-xs text-graphite">Não chegou? Veja o spam ou as promoções.</p>
        {error && <p className="text-sm text-coral-dark">{error}</p>}
        {resent && !error && <p className="text-sm text-[#2F5654]">E-mail reenviado.</p>}
        <button
          type="button"
          onClick={() => resend(sentTo)}
          disabled={cooldown > 0}
          className="rounded-full px-5 py-2.5 text-sm font-medium ring-1 ring-ink/20 hover:bg-white disabled:opacity-50"
        >
          {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar e-mail"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            switchMode("entrar");
          }}
          className="text-sm text-graphite underline underline-offset-4"
        >
          Voltar para entrar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Acesso" className="grid grid-cols-2 rounded-full bg-paper p-1 ring-1 ring-ink/5">
        {(["entrar", "cadastrar"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`rounded-full py-2 text-sm font-medium transition-colors ${
              mode === m ? "bg-ink text-paper shadow-sm" : "text-graphite hover:text-ink"
            }`}
          >
            {m === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      {GOOGLE_ENABLED && (
        <>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex items-center justify-center gap-2.5 rounded-full bg-white px-5 py-3 text-sm font-medium ring-1 ring-ink/15 hover:bg-paper"
          >
            <GoogleIcon />
            Continuar com Google
          </button>
          <div className="flex items-center gap-3 text-xs text-graphite" aria-hidden>
            <span className="h-px flex-1 bg-ink/10" />
            ou com e-mail
            <span className="h-px flex-1 bg-ink/10" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "cadastrar" && (
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Como quer ser chamado?"
            aria-label="Nome"
            autoComplete="given-name"
            className={field}
          />
        )}
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          aria-label="E-mail"
          autoComplete="email"
          className={field}
        />
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            placeholder={mode === "cadastrar" ? "Senha (mínimo 6 caracteres)" : "Senha"}
            aria-label="Senha"
            autoComplete={mode === "entrar" ? "current-password" : "new-password"}
            className={`${field} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-graphite hover:bg-ink/5"
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-coral-dark">
            {error}{" "}
            {unconfirmedEmail && (
              <button
                type="button"
                onClick={() => resend(unconfirmedEmail)}
                disabled={cooldown > 0}
                className="font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
              </button>
            )}
          </p>
        )}
        {resent && !error && <p className="text-sm text-[#2F5654]">Link reenviado. Confira seu e-mail.</p>}

        <button type="submit" disabled={busy} className={`${primary} mt-1`}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
