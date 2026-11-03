// Lista fixa de categorias dos livros. O banco guarda o slug (books.categories);
// renomear um rótulo é livre, mas mudar um slug exige migrar os livros que o usam.

export type CategoryGroup = "ficcao" | "nao-ficcao";

export interface Category {
  slug: string;
  label: string;
  group: CategoryGroup;
}

/** Máximo por livro (constraint books_categories_check). */
export const MAX_CATEGORIES = 3;

export const CATEGORY_GROUP_LABEL: Record<CategoryGroup, string> = {
  ficcao: "Ficção",
  "nao-ficcao": "Não ficção",
};

const FICCAO = [
  ["romance", "Romance"],
  ["aventura", "Aventura"],
  ["fantasia", "Fantasia"],
  ["ficcao-cientifica", "Ficção científica"],
  ["suspense", "Suspense e mistério"],
  ["policial", "Policial"],
  ["terror", "Terror"],
  ["drama", "Drama"],
  ["classicos", "Clássicos"],
  ["contos", "Contos e crônicas"],
  ["poesia", "Poesia"],
  ["humor", "Humor"],
  ["infantojuvenil", "Infantojuvenil"],
  ["distopia", "Distopia"],
] as const;

const NAO_FICCAO = [
  ["biografia", "Biografia e memórias"],
  ["historia", "História"],
  ["politica", "Política"],
  ["sociologia", "Sociologia"],
  ["filosofia", "Filosofia"],
  ["psicologia", "Psicologia"],
  ["economia", "Economia"],
  ["negocios", "Negócios e carreira"],
  ["fisica", "Física e astronomia"],
  ["matematica", "Matemática"],
  ["biologia", "Biologia e natureza"],
  ["saude", "Saúde e bem-estar"],
  ["religiao", "Religião e espiritualidade"],
  ["autoajuda", "Autoajuda"],
  ["educacao", "Educação"],
  ["direito", "Direito"],
  ["arte", "Arte e cultura"],
  ["tecnologia", "Tecnologia"],
  ["viagem", "Viagem"],
  ["culinaria", "Culinária"],
] as const;

export const CATEGORIES: Category[] = [
  ...FICCAO.map(([slug, label]) => ({ slug, label, group: "ficcao" as const })),
  ...NAO_FICCAO.map(([slug, label]) => ({ slug, label, group: "nao-ficcao" as const })),
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function findCategory(slug: string | null | undefined): Category | null {
  return (slug && BY_SLUG.get(slug)) || null;
}

/** Só slugs conhecidos, sem repetição, até o máximo, na ordem da lista. */
export function normalizeCategories(slugs: readonly string[]): string[] {
  const chosen = new Set(slugs);
  return CATEGORIES.filter((c) => chosen.has(c.slug))
    .slice(0, MAX_CATEGORIES)
    .map((c) => c.slug);
}
