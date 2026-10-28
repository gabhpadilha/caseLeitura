"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"entrar" | "cadastrar">("entrar");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const supabase = createClient();

    setBusy(true);
    setError(null);
    setInfo(null);

    const { data, error } =
      mode === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (error) return setError(error.message);
    if (!data.session) return setInfo("Confira seu e-mail para confirmar o cadastro.");

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        placeholder="E-mail"
        autoComplete="email"
        className="rounded-full bg-paper px-5 py-3 text-sm ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-coral"
      />
      <input
        name="password"
        type="password"
        required
        minLength={6}
        placeholder="Senha"
        autoComplete={mode === "entrar" ? "current-password" : "new-password"}
        className="rounded-full bg-paper px-5 py-3 text-sm ring-1 ring-ink/10 outline-none focus:ring-2 focus:ring-coral"
      />
      {error && <p className="text-sm text-coral-dark">{error}</p>}
      {info && <p className="text-sm text-[#2F5654]">{info}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
      >
        {mode === "entrar" ? "Entrar" : "Criar conta"}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "entrar" ? "cadastrar" : "entrar")}
        className="text-sm text-graphite underline underline-offset-4"
      >
        {mode === "entrar" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
      </button>
    </form>
  );
}
