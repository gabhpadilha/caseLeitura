"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Modal, modalField, modalPrimaryButton, modalSecondaryButton } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";

interface ProfileButtonProps {
  /** Nome exibido hoje (escolhido ou derivado do e-mail). */
  name: string;
  /** Nome escolhido, se o usuário já definiu um. */
  displayName: string | null;
  email: string | null;
}

// Limite da constraint profiles.display_name.
const NAME_MAX = 80;

/** Avatar do topo: abre "Como quer ser chamado?" e o botão de sair. */
export function ProfileButton({ name, displayName, email }: ProfileButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("displayName") ?? "").trim();

    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setPending(false);
      return setError("Sua sessão expirou. Entre de novo.");
    }
    // O perfil é criado no cadastro (trigger); select() confirma que a linha existia.
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: value || null })
      .eq("id", auth.user.id)
      .select("id");
    setPending(false);

    if (error || !data?.length) return setError("Não foi possível salvar. Tente de novo.");
    setOpen(false);
    router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        title={name}
        aria-label={`Perfil de ${name}`}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage text-lg font-semibold text-white transition-shadow hover:ring-4 hover:ring-sage/25"
      >
        {name.charAt(0).toUpperCase()}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy="perfil-titulo" dismissible={!pending}>
        <form key={`${open}`} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-sage text-2xl font-semibold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 id="perfil-titulo" className="font-display text-3xl leading-tight font-semibold">
                Como quer ser chamado?
              </h2>
              {email && <p className="truncate text-sm text-graphite">{email}</p>}
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nome na saudação
            <input
              name="displayName"
              maxLength={NAME_MAX}
              defaultValue={displayName ?? ""}
              placeholder={name}
              autoComplete="given-name"
              className={modalField}
            />
          </label>
          <p className="-mt-2 text-xs text-graphite">
            Aparece em “Boa leitura, …”. Em branco, usamos o começo do seu e-mail.
          </p>
          {error && <p className="text-sm text-coral-dark">{error}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={signOut}
              disabled={pending}
              className="mr-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium text-graphite hover:bg-ink/5"
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className={modalSecondaryButton}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} className={modalPrimaryButton}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
