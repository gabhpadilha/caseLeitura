-- =============================================================================
-- Comunidade, etapa 6: notificações de comentário.
--
-- Quem tem a resenha comentada por outra pessoa recebe a notificação. Não há
-- tabela de notificações: elas são os próprios comentários nas resenhas da
-- pessoa. Só guardamos até quando ela já viu (seen_at), numa tabela à parte —
-- profiles é lido por todos os membros, e isso diria quando cada um entrou.
-- =============================================================================

create table public.notification_reads (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now()
);

alter table public.notification_reads enable row level security;
revoke all on public.notification_reads from anon, authenticated;
-- Leitura e escrita só pelas funções abaixo.

-- Comentários de outras pessoas nas minhas resenhas, mais recentes primeiro.
create or replace function public.notifications(p_limit integer default 30)
returns table (
  comment_id   uuid,
  review_id    uuid,
  book_id      uuid,
  book_title   text,
  author_id    uuid,
  author_name  text,
  excerpt      text,
  created_at   timestamptz,
  unread       boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, r.id, b.id, b.title, c.user_id, p.display_name,
         left(c.content, 160), c.created_at,
         c.created_at > coalesce(nr.seen_at, '-infinity'::timestamptz)
  from public.reviews r
  join public.review_comments c on c.review_id = r.id
  join public.books b on b.id = r.book_id
  left join public.profiles p on p.id = c.user_id
  left join public.notification_reads nr on nr.user_id = r.user_id
  where (select auth.uid()) is not null
    and r.user_id = (select auth.uid())
    and c.user_id <> r.user_id
  order by c.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

revoke execute on function public.notifications(integer) from public, anon;
grant execute on function public.notifications(integer) to authenticated;

-- Quantas ainda não vi (o número no sino).
create or replace function public.unread_notifications()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.reviews r
  join public.review_comments c on c.review_id = r.id
  left join public.notification_reads nr on nr.user_id = r.user_id
  where (select auth.uid()) is not null
    and r.user_id = (select auth.uid())
    and c.user_id <> r.user_id
    and c.created_at > coalesce(nr.seen_at, '-infinity'::timestamptz);
$$;

revoke execute on function public.unread_notifications() from public, anon;
grant execute on function public.unread_notifications() to authenticated;

-- Marca tudo como visto (ao abrir a página de notificações).
create or replace function public.mark_notifications_seen()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Entre para ver as notificações.' using errcode = '42501';
  end if;
  insert into public.notification_reads (user_id, seen_at) values (auth.uid(), now())
  on conflict (user_id) do update set seen_at = excluded.seen_at;
end;
$$;

revoke execute on function public.mark_notifications_seen() from public, anon;
grant execute on function public.mark_notifications_seen() to authenticated;
