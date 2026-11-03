import { permanentRedirect } from "next/navigation";
import { SHELVES } from "@/types/book";

/** As prateleiras viraram filtros da página Livros: links antigos caem no filtro certo. */
export default async function PrateleiraPage({ params }: PageProps<"/estante/[shelf]">) {
  const { shelf } = await params;
  const known = SHELVES.some((s) => s.slug === shelf);
  permanentRedirect(known ? `/?estado=${shelf}` : "/");
}

export function generateStaticParams() {
  return SHELVES.map((s) => ({ shelf: s.slug }));
}
