"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LibraryBig, MessageCircleMore, Newspaper, Plus, Users, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

// Destinos: os livros (com filtros de estado e categoria), a timeline de resenhas,
// os leitores (estante de cada um), os quadrinhos e o envio.
// A conta (nome, convites e sair) fica no avatar do topo.
const LIVROS: NavItem = {
  href: "/",
  label: "Livros",
  icon: LibraryBig,
  isActive: (p) => p === "/" || (p.startsWith("/livros/") && p !== "/livros/novo"),
};
const TIMELINE: NavItem = {
  href: "/timeline",
  label: "Timeline",
  icon: Newspaper,
  isActive: (p) => p.startsWith("/timeline"),
};
const LEITORES: NavItem = {
  href: "/leitores",
  label: "Leitores",
  icon: Users,
  isActive: (p) => p.startsWith("/leitores"),
};
const QUADRINHOS: NavItem = {
  href: "/quadrinhos",
  label: "Quadrinhos",
  icon: MessageCircleMore,
  isActive: (p) => p.startsWith("/quadrinhos"),
};
const ENVIAR: NavItem = {
  href: "/livros/novo",
  label: "Enviar",
  icon: Plus,
  isActive: (p) => p === "/livros/novo",
};

/** Trilho lateral no tablet/desktop e barra inferior no celular. */
export function AppNav() {
  return <NavMarkup pathname={usePathname()} />;
}

/**
 * Mesma barra sem item ativo, para o fallback do Suspense: em rotas dinâmicas o
 * pathname só existe na requisição, e o Cache Components exige o limite.
 */
export function AppNavFallback() {
  return <NavMarkup pathname={null} />;
}

function NavLink({ item, pathname, raised = false }: { item: NavItem; pathname: string | null; raised?: boolean }) {
  const active = pathname !== null && item.isActive(pathname);
  const Icon = item.icon;
  const circle = raised
    ? `size-14 -mt-7 bg-ink text-paper shadow-lg shadow-ink/30 md:mt-0 md:bg-transparent md:text-ink md:shadow-none md:border-2 md:border-dashed ${
        active ? "md:border-coral md:text-coral-dark" : "md:border-ink/25 md:hover:border-ink/50"
      }`
    : `size-12 md:size-14 ${active ? "bg-coral text-white shadow-lg shadow-coral/30" : "text-ink hover:bg-ink/5"}`;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex min-w-14 flex-col items-center gap-1"
    >
      <span className={`flex items-center justify-center rounded-full transition-colors ${circle}`}>
        <Icon className="size-[1.35rem]" strokeWidth={raised ? 2.2 : 1.7} aria-hidden />
      </span>
      <span className={`text-[0.68rem] font-semibold ${active ? "text-ink" : "text-graphite"}`}>{item.label}</span>
    </Link>
  );
}

function NavMarkup({ pathname }: { pathname: string | null }) {
  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center gap-5 border-r border-ink/10 bg-paper py-8 md:flex"
      >
        <Link href="/" aria-label="caseLeitura — livros" className="mb-7 text-ink">
          <LogoMark className="size-11" />
        </Link>
        <NavLink item={LIVROS} pathname={pathname} />
        <NavLink item={TIMELINE} pathname={pathname} />
        <NavLink item={LEITORES} pathname={pathname} />
        <NavLink item={QUADRINHOS} pathname={pathname} />
        <NavLink item={ENVIAR} pathname={pathname} raised />
      </nav>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-around border-t border-ink/10 bg-paper/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
      >
        <NavLink item={LIVROS} pathname={pathname} />
        <NavLink item={TIMELINE} pathname={pathname} />
        <NavLink item={ENVIAR} pathname={pathname} raised />
        <NavLink item={LEITORES} pathname={pathname} />
        <NavLink item={QUADRINHOS} pathname={pathname} />
      </nav>
    </>
  );
}
