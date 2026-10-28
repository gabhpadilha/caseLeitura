import { LoginForm } from "@/components/auth/LoginForm";
import { LogoMark, Wordmark } from "@/components/brand/Logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <LogoMark className="size-16 text-ink" />
          <h1>
            <Wordmark className="text-5xl" />
          </h1>
          <p className="font-display text-xl text-graphite italic">
            A casa dos seus livros: lidos, lendo e por ler.
          </p>
        </div>
        <div className="rounded-[2rem] bg-paper-soft p-6 sm:p-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
