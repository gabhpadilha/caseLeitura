-- =============================================================================
-- Comunidade, etapa 1: convites, galerias visíveis e resenhas compartilháveis.
--
-- Regras (todas aplicadas no banco, não na interface):
--   * Só entra quem tem convite: o cadastro sem convite válido é recusado aqui.
--   * Membros veem o nome uns dos outros e a galeria (capa, título, autor,
--     estado, categorias) — nunca o progresso, os caminhos ou os arquivos.
--   * Do Storage, os outros só conseguem abrir a capa (cover.webp). PDF, texto,
--     ilustrações e páginas de quadrinho continuam só do dono.
--   * Resenha só aparece para os outros quando o dono compartilha.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Convites: link de uso único, válido por 7 dias
-- -----------------------------------------------------------------------------
create table public.invites (
  token      uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  -- Preenchido no cadastro (gatilho abaixo). Diferida: o usuário ainda está sendo inserido.
  used_by    uuid references auth.users (id) on delete set null deferrable initially deferred,
  used_at    timestamptz
);

create index invites_created_by_idx on public.invites (created_by, created_at desc);

alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;
-- Criar só via create_invite() (limite e token gerados no banco); ver e cancelar os próprios.
grant select, delete on public.invites to authenticated;

create policy "invites: dono lê" on public.invites for select to authenticated
  using (created_by = (select auth.uid()));
create policy "invites: dono cancela não usado" on public.invites for delete to authenticated
  using (created_by = (select auth.uid()) and used_at is null);

-- Gera um convite. Máximo de 5 ativos (não usados e no prazo) por pessoa.
create or replace function public.create_invite()
returns public.invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  invite public.invites;
begin
  if uid is null then
    raise exception 'Entre para convidar alguém.' using errcode = '42501';
  end if;
  if (
    select count(*) from public.invites
    where created_by = uid and used_at is null and expires_at > now()
  ) >= 5 then
    raise exception 'invite_limit' using errcode = 'P0001',
      hint = 'Você já tem 5 convites ativos. Espere alguém usar ou cancele um.';
  end if;
  insert into public.invites (created_by) values (uid) returning * into invite;
  return invite;
end;
$$;

revoke execute on function public.create_invite() from public, anon;
grant execute on function public.create_invite() to authenticated;

-- Tela de cadastro: diz se o link vale e quem convidou (sem expor mais nada).
create or replace function public.check_invite(p_token text)
returns table (valid boolean, inviter_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return query select false, null::text;
    return;
  end if;
  return query
    select true, p.display_name
    from public.invites i
    left join public.profiles p on p.id = i.created_by
    where i.token = p_token::uuid and i.used_at is null and i.expires_at > now();
  if not found then
    return query select false, null::text;
  end if;
end;
$$;

revoke execute on function public.check_invite(text) from public;
grant execute on function public.check_invite(text) to anon, authenticated;

-- Cadastro: exige um convite válido nos metadados ({ invite: "<token>" }) e o consome.
-- Vale para qualquer caminho (formulário, API, Google): sem convite, nada de conta.
create or replace function private.require_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := new.raw_user_meta_data ->> 'invite';
  v_used  uuid;
begin
  if v_token is null or v_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'invite_required' using errcode = 'P0001';
  end if;

  update public.invites
     set used_by = new.id, used_at = now()
   where token = v_token::uuid and used_at is null and expires_at > now()
  returning token into v_used;

  if v_used is null then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;

  -- O token não fica guardado no usuário.
  new.raw_user_meta_data := new.raw_user_meta_data - 'invite';
  return new;
end;
$$;

revoke execute on function private.require_invite() from public, anon, authenticated;

drop trigger if exists before_auth_user_created_require_invite on auth.users;
create trigger before_auth_user_created_require_invite
  before insert on auth.users
  for each row execute function private.require_invite();

-- -----------------------------------------------------------------------------
-- Perfis: todo membro vê o nome dos outros
-- -----------------------------------------------------------------------------
create policy "profiles: membros leem" on public.profiles for select to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- Resenhas: compartilhar na timeline e aviso de spoiler
-- -----------------------------------------------------------------------------
alter table public.reviews
  add column shared    boolean not null default false,
  add column spoiler   boolean not null default false,
  -- Quando foi compartilhada (ordem da timeline). Mantido pelo gatilho abaixo.
  add column shared_at timestamptz;

create or replace function private.set_review_shared_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.shared then
    new.shared_at := null;
  elsif tg_op = 'INSERT' or not old.shared then
    new.shared_at := now();
  else
    new.shared_at := old.shared_at;
  end if;
  return new;
end;
$$;

create trigger reviews_set_shared_at
  before insert or update on public.reviews
  for each row execute function private.set_review_shared_at();

create index reviews_shared_at_idx on public.reviews (shared_at desc) where shared;

create policy "reviews: membros leem compartilhadas" on public.reviews for select to authenticated
  using (shared);

-- -----------------------------------------------------------------------------
-- Galeria de um membro: só os campos do cartão. A tabela books continua
-- fechada ao dono (o RLS não esconde colunas, então os outros leem por aqui).
-- -----------------------------------------------------------------------------
create or replace function public.member_books(p_user uuid)
returns table (
  id          uuid,
  title       text,
  author      text,
  status      public.reading_status,
  kind        public.book_kind,
  categories  text[],
  cover_path  text,
  created_at  timestamptz,
  finished_at date,
  rating      smallint,
  review      text,
  spoiler     boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.title, b.author, b.status, b.kind, b.categories, b.cover_path,
         b.created_at, b.finished_at,
         r.rating, r.content, r.spoiler
  from public.books b
  left join public.reviews r on r.book_id = b.id and r.user_id = b.user_id and r.shared
  where (select auth.uid()) is not null
    and b.user_id = p_user
  order by b.created_at desc;
$$;

revoke execute on function public.member_books(uuid) from public, anon;
grant execute on function public.member_books(uuid) to authenticated;

-- Timeline: resenhas compartilhadas, mais recentes primeiro (paginação por shared_at).
create or replace function public.timeline(p_before timestamptz default null, p_limit integer default 20)
returns table (
  review_id   uuid,
  user_id     uuid,
  user_name   text,
  book_id     uuid,
  book_title  text,
  book_author text,
  cover_path  text,
  rating      smallint,
  content     text,
  spoiler     boolean,
  shared_at   timestamptz,
  updated_at  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.user_id, p.display_name, b.id, b.title, b.author, b.cover_path,
         r.rating, r.content, r.spoiler, r.shared_at, r.updated_at
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

-- -----------------------------------------------------------------------------
-- Storage: capas visíveis para membros; o resto do bucket segue só do dono.
-- Caminho da capa: {user_id}/{book_id}/cover.webp
-- -----------------------------------------------------------------------------
create policy "books bucket: membros leem capas" on storage.objects for select to authenticated
  using (
    bucket_id = 'books'
    and storage.filename(name) = 'cover.webp'
    and array_length(storage.foldername(name), 1) = 2
  );
