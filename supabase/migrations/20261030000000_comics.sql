-- =============================================================================
-- Quadrinhos: a mesma tabela `books`, com o tipo do item.
--   kind = 'book'  → livro (texto extraído, leitor de texto)
--   kind = 'comic' → quadrinho (páginas como imagens em {user_id}/{book_id}/pages/)
-- Os livros já existentes continuam como 'book' (default).
-- =============================================================================

create type public.book_kind as enum ('book', 'comic');

alter table public.books
  add column kind public.book_kind not null default 'book';

-- A estante de livros e a banca de quadrinhos listam por tipo, do mais recente.
create index books_user_kind_created_idx
  on public.books (user_id, kind, created_at desc);

-- O original de um quadrinho pode ser CBZ (zip de imagens).
update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'text/plain', 'image/webp', 'image/jpeg', 'image/png',
  'image/gif', 'application/zip', 'application/vnd.comicbook+zip', 'application/x-cbz'
]
where id = 'books';
