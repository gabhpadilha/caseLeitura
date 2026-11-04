-- Remove o limite de 5 convites ativos por pessoa.
-- Cada convite continua sendo de uso único e expira em 7 dias.
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
  insert into public.invites (created_by) values (uid) returning * into invite;
  return invite;
end;
$$;

revoke execute on function public.create_invite() from public, anon;
grant execute on function public.create_invite() to authenticated;
