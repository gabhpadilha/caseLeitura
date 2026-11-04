"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Send, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Gera um link de convite (uso único, 7 dias). O banco cria o token;
 * aqui só mostramos e compartilhamos o link.
 */
export function InviteSection() {
  const [link, setLink] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setPending(true);
    setError(null);
    const { data, error } = await createClient().rpc("create_invite");
    setPending(false);
    if (error || !data) {
      return setError(error?.hint || "Não foi possível gerar o convite. Tente de novo.");
    }
    setLink(`${window.location.origin}/login?convite=${data.token}`);
    setCopied(false);
  }

  async function share() {
    if (!link) return;
    const text = "Vem montar a sua estante no caseLeitura comigo:";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Convite · caseLeitura", text, url: link });
        return;
      } catch {
        // Cancelado ou indisponível: copia.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Não deu para copiar. Selecione o link e copie à mão.");
    }
  }

  return (
    <section aria-labelledby="convite-titulo" className="border-t border-ink/10 pt-4">
      <h3 id="convite-titulo" className="flex items-center gap-2 text-sm font-semibold">
        <UserPlus className="size-4" aria-hidden /> Convidar alguém
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-graphite">
        O caseLeitura é só para convidados. Cada link vale para uma pessoa e expira em 7 dias.
      </p>

      {link ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            readOnly
            value={link}
            aria-label="Link de convite"
            onFocus={(e) => e.currentTarget.select()}
            className="w-full truncate rounded-2xl bg-paper px-4 py-2.5 text-xs ring-1 ring-ink/10"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={share}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink/85"
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
              {copied ? "Link copiado" : "Enviar convite"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(link).then(() => setCopied(true), () => undefined);
              }}
              aria-label="Copiar link"
              className="flex size-10 items-center justify-center rounded-full ring-1 ring-ink/20 hover:bg-white"
            >
              <Copy className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ring-1 ring-ink/20 hover:bg-white disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Gerar link de convite
        </button>
      )}
      {error && <p className="mt-2 text-sm text-coral-dark">{error}</p>}
    </section>
  );
}
