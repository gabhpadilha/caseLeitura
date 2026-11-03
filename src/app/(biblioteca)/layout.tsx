import { Suspense } from "react";
import { AppNav, AppNavFallback } from "@/components/layout/AppNav";
import { HeaderUser } from "@/components/layout/HeaderUser";

export default function BibliotecaLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:pl-24">
      <Suspense fallback={<AppNavFallback />}>
        <AppNav />
      </Suspense>
      <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-5 sm:px-8 lg:px-14">
        {/* Topo enxuto: a busca mora na página Livros e o envio no menu; aqui fica a conta. */}
        <header className="flex items-center justify-end gap-3 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6">
          <Suspense fallback={<span className="size-12 rounded-full bg-ink/5" />}>
            <HeaderUser />
          </Suspense>
        </header>
        <main className="flex-1 pb-28 md:pb-16">{children}</main>
      </div>
    </div>
  );
}
