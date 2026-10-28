import { Suspense } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { AppNav, AppNavFallback } from "@/components/layout/AppNav";
import { HeaderUser } from "@/components/layout/HeaderUser";
import { SearchBar, SearchBarFallback } from "@/components/layout/SearchBar";

export default function BibliotecaLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:pl-24">
      <Suspense fallback={<AppNavFallback />}>
        <AppNav />
      </Suspense>
      <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-5 sm:px-8 lg:px-14">
        <header className="flex items-center gap-3 pt-[max(1.75rem,env(safe-area-inset-top))] pb-10 sm:gap-4">
          <Suspense fallback={<SearchBarFallback />}>
            <SearchBar />
          </Suspense>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/livros/novo"
              aria-label="Enviar PDF"
              className="flex items-center gap-2.5 rounded-full px-3.5 py-3 font-medium ring-1 ring-ink transition-colors hover:bg-ink hover:text-paper sm:px-7"
            >
              <Upload className="size-[1.1rem]" aria-hidden />
              <span className="hidden sm:inline">Enviar PDF</span>
            </Link>
            <Suspense fallback={<span className="size-12 rounded-full bg-ink/5" />}>
              <HeaderUser />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 pb-28 md:pb-16">{children}</main>
      </div>
    </div>
  );
}
