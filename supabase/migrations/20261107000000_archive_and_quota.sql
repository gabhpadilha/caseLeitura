-- =============================================================================
-- Arquivar livros + cota de espaço por usuário.
--
-- Contrato de "arquivar" (o app faz: apaga arquivos pela Storage API e atualiza
-- a linha em `books`; o banco só guarda o estado):
--   archived_at  IS NULL                      → livro normal.
--   archive_level = 'original'                → só o original (original.pdf e as
--                                               partes original.pdf.partNNN) foi
--                                               apagado; o livro continua legível
--                                               (content.txt, images/, pages/ ficam).
--   archive_level = 'full'                    → original, images/, pages/ e
--                                               content.txt foram apagados e
--                                               content_path fica NULL. A capa e as
--                                               resenhas permanecem.
-- As duas colunas andam juntas: ambas nulas ou ambas preenchidas.
--
-- Permissões: `books` tem GRANT de UPDATE na tabela inteira (sem lista de
-- colunas) e a policy "books: dono atualiza" filtra por user_id. As novas colunas
-- herdam isso: só o dono altera; os demais usuários nem enxergam a linha para
-- escrita. Nada a conceder aqui.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A.1 Colunas de arquivamento
-- -----------------------------------------------------------------------------
alter table public.books
  add column if not exists archived_at  timestamptz,
  add column if not exists archive_level text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.books'::regclass and conname = 'books_archive_level_check'
  ) then
    alter table public.books
      add constraint books_archive_level_check
      check (archive_level in ('original', 'full'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.books'::regclass and conname = 'books_archive_consistent_check'
  ) then
    alter table public.books
      add constraint books_archive_consistent_check
      check ((archived_at is null) = (archive_level is null));
  end if;
end
$$;

comment on column public.books.archived_at is
  'Quando o livro foi arquivado (NULL = não arquivado). Vai junto com archive_level.';
comment on column public.books.archive_level is
  'original = só o original (e partes) apagado, livro segue legível; '
  'full = original, images/, pages/ e content.txt apagados (content_path NULL); '
  'capa e resenhas permanecem.';

-- -----------------------------------------------------------------------------
-- A.2 Cota (único lugar para mudar)
-- -----------------------------------------------------------------------------
create or replace function public.storage_quota_bytes()
returns bigint
language sql
immutable
set search_path = ''
as $$
  select 104857600::bigint; -- 100 MB (100 * 1024 * 1024)
$$;

comment on function public.storage_quota_bytes() is
  'Cota de espaço por usuário no bucket "books", em bytes (100 MB). Único lugar '
  'para mudar a cota no banco. O app tem uma constante espelho em '
  'src/lib/books/quota.ts que deve acompanhar este valor.';

revoke execute on function public.storage_quota_bytes() from public, anon;
grant  execute on function public.storage_quota_bytes() to authenticated;

-- -----------------------------------------------------------------------------
-- A.3 Espaço usado por um usuário
--
-- Fica em `private` (não exposto pela API REST). A policy de INSERT do Storage é
-- avaliada com o papel do usuário, então `authenticated` precisa de USAGE no
-- schema private e EXECUTE nesta função. Isso NÃO a expõe pela API: o PostgREST
-- só publica os schemas configurados (public). Defesa extra: um usuário logado só
-- consegue somar a própria pasta (p_user diferente de auth.uid() devolve 0);
-- chamadas sem usuário (service_role/painel) podem consultar qualquer um.
-- Demais funções de private seguem sem EXECUTE para authenticated.
-- -----------------------------------------------------------------------------
create or replace function private.storage_used(p_user uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects o
  where o.bucket_id = 'books'
    and (storage.foldername(o.name))[1] = p_user::text
    and ((select auth.uid()) is null or (select auth.uid()) = p_user);
$$;

revoke execute on function private.storage_used(uuid) from public, anon, authenticated;
grant  usage   on schema private to authenticated;
grant  execute on function private.storage_used(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- A.4 Meu uso x cota (para a tela do app)
-- -----------------------------------------------------------------------------
create or replace function public.my_storage_usage()
returns table (used_bytes bigint, quota_bytes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;

  return query
    select private.storage_used(v_uid), public.storage_quota_bytes();
end;
$$;

revoke execute on function public.my_storage_usage() from public, anon;
grant  execute on function public.my_storage_usage() to authenticated;

-- -----------------------------------------------------------------------------
-- A.5 Espaço por livro (todos os arquivos: original e partes, capa, content.txt,
-- images/, pages/). foldername devolve o array de pastas, então o 2º elemento é
-- o id do livro mesmo para arquivos em subpastas. Só pastas que parecem uuid.
-- -----------------------------------------------------------------------------
create or replace function public.my_book_sizes()
returns table (book_id uuid, bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select s.book_id, sum(s.size)::bigint as bytes
  from (
    select
      case
        when (storage.foldername(o.name))[2]
             ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then ((storage.foldername(o.name))[2])::uuid
      end as book_id,
      coalesce((o.metadata ->> 'size')::bigint, 0) as size
    from storage.objects o
    where o.bucket_id = 'books'
      and (select auth.uid()) is not null
      and (storage.foldername(o.name))[1] = (select auth.uid())::text
  ) s
  where s.book_id is not null
  group by s.book_id;
$$;

revoke execute on function public.my_book_sizes() from public, anon;
grant  execute on function public.my_book_sizes() to authenticated;

-- -----------------------------------------------------------------------------
-- A.6 Backstop de cota no Storage
--
-- O app faz uma pré-checagem amigável (mostra o erro antes de enviar). Esta
-- policy é o freio de segurança contra clientes que pulem o app: bloqueia novos
-- envios quando o espaço já usado atinge a cota. Como a soma não inclui o arquivo
-- que está chegando, o usuário pode estourar a cota em no máximo UM envio (até o
-- limite de 50 MB por arquivo do bucket). A soma roda a cada insert; `(select ...)`
-- faz o planner avaliar uma vez por comando (initplan). Ok para esta escala.
-- Policies de select/update/delete do bucket não mudam.
-- -----------------------------------------------------------------------------
drop policy if exists "books bucket: dono envia" on storage.objects;
create policy "books bucket: dono envia" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'books'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.storage_used((select auth.uid()))) < (select public.storage_quota_bytes())
  );
