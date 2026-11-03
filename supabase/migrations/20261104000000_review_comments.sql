-- =============================================================================
-- Comunidade, etapa 5: comentários nas resenhas compartilhadas.
--
-- Regras (no banco):
--   * Comenta quem é membro, e só em resenha compartilhada.
--   * Vê os comentários quem vê a resenha (compartilhada, ou o próprio dono).
--   * Sem edição. Apaga quem escreveu ou o dono da resenha (moderação).
-- =============================================================================

create table public.review_comments (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content    text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index review_comments_review_id_idx on public.review_comments (review_id, created_at);
create index review_comments_user_id_idx on public.review_comments (user_id);

alter table public.review_comments enable row level security;
revoke all on public.review_comments from anon, authenticated;
grant select, insert, delete on public.review_comments to authenticated;

-- O exists() roda com o RLS de reviews: só enxerga resenhas compartilhadas ou as próprias.
create policy "comments: quem vê a resenha lê" on public.review_comments for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id));

create policy "comments: membro comenta em resenha compartilhada" on public.review_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.reviews r where r.id = review_id and r.shared)
  );

create policy "comments: autor ou dono da resenha apaga" on public.review_comments
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.reviews r where r.id = review_id and r.user_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- timeline() e member_books() passam a devolver o id da resenha e o número de
-- comentários (o tipo de retorno muda, então recria).
-- -----------------------------------------------------------------------------
drop function if exists public.timeline(timestamptz, integer);
create function public.timeline(p_before timestamptz default null, p_limit integer default 20)
returns table (
  review_id     uuid,
  user_id       uuid,
  user_name     text,
  book_id       uuid,
  book_title    text,
  book_author   text,
  cover_path    text,
  rating        smallint,
  content       text,
  spoiler       boolean,
  shared_at     timestamptz,
  updated_at    timestamptz,
  comment_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.user_id, p.display_name, b.id, b.title, b.author, b.cover_path,
         r.rating, r.content, r.spoiler, r.shared_at, r.updated_at,
         (select count(*) from public.review_comments c where c.review_id = r.id)::integer
  from public.reviews r
  join public.books b on b.id = r.book_id and b.user_id = r.user_id
  left join public.profiles p on p.id = r.user_id
  where (select auth.uid()) is not null
    and r.shared
    and (p_before is null or r.shared_at < p_before)
  order by r.shared_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.timeline(timestamptz, integer) from public, anon;
grant execute on function public.timeline(timestamptz, integer) to authenticated;

-- Uma resenha (página da conversa): compartilhada, ou a própria.
create or replace function public.review_post(p_review uuid)
returns table (
  review_id     uuid,
  user_id       uuid,
  user_name     text,
  book_id       uuid,
  book_title    text,
  book_author   text,
  cover_path    text,
  rating        smallint,
  content       text,
  spoiler       boolean,
  shared        boolean,
  shared_at     timestamptz,
  updated_at    timestamptz,
  comment_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.user_id, p.display_name, b.id, b.title, b.author, b.cover_path,
         r.rating, r.content, r.spoiler, r.shared, r.shared_at, r.updated_at,
         (select count(*) from public.review_comments c where c.review_id = r.id)::integer
  from public.reviews r
  join public.books b on b.id = r.book_id and b.user_id = r.user_id
  left join public.profiles p on p.id = r.user_id
  where (select auth.uid()) is not null
    and r.id = p_review
    and (r.shared or r.user_id = (select auth.uid()));
$$;

revoke execute on function public.review_post(uuid) from public, anon;
grant execute on function public.review_post(uuid) to authenticated;

drop function if exists public.member_books(uuid);
create function public.member_books(p_user uuid)
returns table (
  id            uuid,
  title         text,
  author        text,
  status        public.reading_status,
  kind          public.book_kind,
  categories    text[],
  cover_path    text,
  created_at    timestamptz,
  finished_at   date,
  review_id     uuid,
  rating        smallint,
  review        text,
  spoiler       boolean,
  comment_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.title, b.author, b.status, b.kind, b.categories, b.cover_path,
         b.created_at, b.finished_at,
         r.id, r.rating, r.content, r.spoiler,
         case when r.id is null then 0
              else (select count(*) from public.review_comments c where c.review_id = r.id)::integer end
  from public.books b
  left join public.reviews r on r.book_id = b.id and r.user_id = b.user_id and r.shared
  where (select auth.uid()) is not null
    and b.user_id = p_user
  order by b.created_at desc;
$$;

revoke execute on function public.member_books(uuid) from public, anon;
grant execute on function public.member_books(uuid) to authenticated;
