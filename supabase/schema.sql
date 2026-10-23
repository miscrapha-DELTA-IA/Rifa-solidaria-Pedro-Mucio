begin;
create table if not exists public.rifa_numeros (
  numero smallint primary key check (numero between 1 and 200),
  vendido boolean not null default false
);
insert into public.rifa_numeros (numero, vendido)
select n, false from generate_series(1,200) as n
on conflict (numero) do nothing;
create table if not exists public.rifa_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.rifa_numeros enable row level security;
alter table public.rifa_admins enable row level security;
revoke all on public.rifa_numeros from anon, authenticated;
revoke all on public.rifa_admins from anon, authenticated;
grant select on public.rifa_numeros to anon, authenticated;
grant update(vendido) on public.rifa_numeros to authenticated;
grant select on public.rifa_admins to authenticated;
drop policy if exists publico_le_disponibilidade on public.rifa_numeros;
create policy publico_le_disponibilidade on public.rifa_numeros
  for select to anon, authenticated using(true);
drop policy if exists admin_consulta_proprio_perfil on public.rifa_admins;
create policy admin_consulta_proprio_perfil on public.rifa_admins
  for select to authenticated using(user_id = (select auth.uid()));
drop policy if exists somente_admin_altera_vendido on public.rifa_numeros;
create policy somente_admin_altera_vendido on public.rifa_numeros
  for update to authenticated
  using(exists(select 1 from public.rifa_admins where user_id=(select auth.uid())))
  with check(exists(select 1 from public.rifa_admins where user_id=(select auth.uid())));
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='rifa_numeros'
  ) then
    alter publication supabase_realtime add table public.rifa_numeros;
  end if;
end $$;
commit;
-- Crie um usuário no painel Authentication > Users; após copiar o User UID, execute:
-- insert into public.rifa_admins(user_id) values ('UUID_DO_USUARIO') on conflict do nothing;
