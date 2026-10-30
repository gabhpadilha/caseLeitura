"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  BookOpen,
  House,
  LogOut,
  MessageCircleMore,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: House },
  { href: "/estante/lendo", label: "Lendo agora", icon: BookOpen },
  { href: "/estante/quero-ler", label: "Quero ler", icon: Bookmark },
  { href: "/estante/lidos", label: "Lidos e resenhas", icon: NotebookPen },
  { href: "/quadrinhos", label: "Quadrinhos", icon: MessageCircleMore },
];

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

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

function NavMarkup({ pathname }: { pathname: string | null }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const itemClass = (active: boolean) =>
    `flex size-12 items-center justify-center rounded-full transition-colors md:size-14 ${
      active ? "bg-coral text-white shadow-lg shadow-coral/30" : "text-ink hover:bg-ink/5"
    }`;

  const items = NAV_ITEMS.map(({ href, label, icon: Icon }) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        title={label}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={itemClass(active)}
      >
        <Icon className="size-[1.35rem]" strokeWidth={1.7} aria-hidden />
      </Link>
    );
  });

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center border-r border-ink/10 bg-paper py-8 md:flex"
      >
        <Link href="/" aria-label="caseLeitura — início" className="mb-12 text-ink">
          <LogoMark className="size-11" />
        </Link>
        <div className="flex flex-1 flex-col items-center gap-5">{items}</div>
        <button onClick={signOut} title="Sair" aria-label="Sair" className={itemClass(false)}>
          <LogOut className="size-5" strokeWidth={1.7} aria-hidden />
        </button>
      </nav>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-ink/10 bg-paper/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
      >
        {items}
        <button onClick={signOut} aria-label="Sair" className={itemClass(false)}>
          <LogOut className="size-5" strokeWidth={1.7} aria-hidden />
        </button>
      </nav>
    </>
  );
}
