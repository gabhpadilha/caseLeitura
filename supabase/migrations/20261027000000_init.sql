-- =============================================================================
-- Minhas Leituras — schema inicial
--
-- Tabelas:  profiles (1:1 auth.users)
--           reading_preferences (1:1 auth.users)
--           books (N:1 usuário)
--           reviews (1 por livro/usuário)
--           notes (N por livro — anotações/trechos)
-- Storage:  bucket privado "books" com layout {user_id}/{book_id}/{arquivo}
-- =============================================================================

create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Enums (os tipos gerados pelo `supabase gen types` viram unions no TypeScript)
-- -----------------------------------------------------------------------------
create type public.reading_status    as enum ('to_read', 'reading', 'finished', 'abandoned');
create type public.processing_status as enum ('pending', 'ready', 'failed');
create type public.reader_theme      as enum ('light', 'dark', 'sepia');
create type public.reader_text_align as enum ('left', 'justify');
create type public.reader_font       as enum ('serif', 'sans');
create type public.reader_leading    as enum ('normal', 'relaxed', 'loose');

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- reading_preferences — preferências globais do leitor (por usuário)
-- -----------------------------------------------------------------------------
create table public.reading_preferences (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  theme       public.reader_theme      not null default 'light',
  -- Degrau da escala tipográfica (1 = menor, 7 = maior). O front mapeia cada
  -- degrau para uma classe Tailwind estática (text-base, text-lg, ...).
  font_size   smallint                 not null default 3 check (font_size between 1 and 7),
  text_align  public.reader_text_align not null default 'justify',
  font_family public.reader_font       not null default 'serif',
  line_height public.reader_leading    not null default 'relaxed',
  updated_at  timestamptz              not null default now()
);

create trigger reading_preferences_set_updated_at
  before update on public.reading_preferences
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- books
-- -----------------------------------------------------------------------------
create table public.books (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 300),
  author            text check (char_length(author) <= 200),
  description       text,
  status            public.reading_status    not null default 'to_read',
  processing_status public.processing_status not null default 'pending',

  -- Caminhos dentro do bucket "books" (não URLs: o bucket é privado e a UI
  -- gera signed URLs sob demanda).
  pdf_path          text not null,
  cover_path        text,
  content_path      text,

  page_count        integer check (page_count >= 0),
  word_count        integer check (word_count >= 0),
  progress          numeric(5, 2) not null default 0 check (progress between 0 and 100),

  started_at        date,
  finished_at       date,
  last_read_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Alvo da FK composta de reviews/notes: garante que a resenha pertence
  -- ao mesmo usuário dono do livro.
  unique (id, user_id),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

-- Galeria: "meus livros, mais recentes primeiro". Também cobre a coluna do RLS.
create index books_user_id_created_at_idx on public.books (user_id, created_at desc);

create trigger books_set_updated_at
  before update on public.books
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- reviews — uma resenha por livro
-- -----------------------------------------------------------------------------
create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null,
  user_id    uuid not null default auth.uid(),
  rating     smallint check (rating between 1 and 5),
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (book_id, user_id) references public.books (id, user_id) on delete cascade,
  -- O índice desta constraint também serve à FK composta acima.
  unique (book_id, user_id)
);

create index reviews_user_id_idx on public.reviews (user_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- notes — anotações e trechos destacados durante a leitura
-- -----------------------------------------------------------------------------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null,
  user_id    uuid not null default auth.uid(),
  quote      text,                                   -- trecho selecionado (opcional)
  content    text not null default '',
  -- Offset de caractere no texto limpo, para voltar ao ponto da anotação.
  position   integer check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (book_id, user_id) references public.books (id, user_id) on delete cascade
);

create index notes_book_id_user_id_idx on public.notes (book_id, user_id, created_at);
create index notes_user_id_idx on public.notes (user_id);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cria profile + preferências padrão quando um usuário se cadastra
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');

  insert into public.reading_preferences (user_id)
  values (new.id);

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Privilégios: nada para anon; CRUD para authenticated (filtrado pelo RLS)
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.reading_preferences, public.books,
              public.reviews, public.notes
  from anon;

grant select, update                 on public.profiles            to authenticated;
grant select, insert, update         on public.reading_preferences to authenticated;
grant select, insert, update, delete on public.books               to authenticated;
grant select, insert, update, delete on public.reviews             to authenticated;
grant select, insert, update, delete on public.notes               to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security — cada usuário só enxerga os próprios dados.
-- `(select auth.uid())` é avaliado uma vez por query, não por linha.
-- -----------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.reading_preferences enable row level security;
alter table public.books               enable row level security;
alter table public.reviews             enable row level security;
alter table public.notes               enable row level security;

create policy "profiles: dono lê"       on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: dono atualiza" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "prefs: dono lê"       on public.reading_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "prefs: dono cria"     on public.reading_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "prefs: dono atualiza" on public.reading_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "books: dono lê"       on public.books for select to authenticated
  using (user_id = (select auth.uid()));
create policy "books: dono cria"     on public.books for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "books: dono atualiza" on public.books for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "books: dono apaga"    on public.books for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "reviews: dono lê"       on public.reviews for select to authenticated
  using (user_id = (select auth.uid()));
create policy "reviews: dono cria"     on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "reviews: dono atualiza" on public.reviews for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reviews: dono apaga"    on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "notes: dono lê"       on public.notes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notes: dono cria"     on public.notes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "notes: dono atualiza" on public.notes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notes: dono apaga"    on public.notes for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Storage — bucket privado "books"
--   {user_id}/{book_id}/original.pdf
--   {user_id}/{book_id}/cover.webp
--   {user_id}/{book_id}/content.txt   (texto limpo, parágrafos separados por \n\n)
-- 50 MB é o limite global de upload do plano Free; ajuste se estiver no Pro.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'books', 'books', false, 52428800,
  array['application/pdf', 'text/plain', 'image/webp', 'image/jpeg', 'image/png']
);

create policy "books bucket: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'books' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "books bucket: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'books' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "books bucket: dono substitui" on storage.objects for update to authenticated
  using (bucket_id = 'books' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'books' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "books bucket: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'books' and (storage.foldername(name))[1] = (select auth.uid())::text);
