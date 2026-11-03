-- Categorias dos livros: até 3 por livro, da lista fixa do app (src/lib/books/categories.ts).
-- Guardadas como slugs ("politica", "ficcao-cientifica"); o rótulo fica no app.

alter table public.books
  add column if not exists categories text[] not null default '{}';

alter table public.books
  drop constraint if exists books_categories_check;
alter table public.books
  add constraint books_categories_check check (
    cardinality(categories) <= 3
    and array_position(categories, null) is null
  );

-- Filtro da galeria (categories @> '{politica}').
create index if not exists books_categories_idx on public.books using gin (categories);
