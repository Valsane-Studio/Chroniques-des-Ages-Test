-- APHANES TEST — accès privé au tableau de bord
-- À exécuter une seule fois dans Supabase > SQL Editor.
--
-- 1. Crée d'abord TON utilisateur dans Supabase Authentication > Users.
-- 2. Exécute ce script.
-- 3. Remplace ensuite l'adresse e-mail de la dernière commande INSERT par la tienne
--    et exécute uniquement cette commande INSERT.

create table if not exists public.dashboard_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.dashboard_admins enable row level security;

alter table public.test_parties
add column if not exists incluse_stats boolean not null default true;

grant select on public.dashboard_admins to authenticated;
grant select on public.test_parties to authenticated;
grant select on public.test_questionnaires to authenticated;
grant delete on public.test_parties to authenticated;
grant update (incluse_stats) on public.test_parties to authenticated;

drop policy if exists "dashboard_admin_read_self" on public.dashboard_admins;
create policy "dashboard_admin_read_self"
on public.dashboard_admins
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "dashboard_admin_read_parties" on public.test_parties;
create policy "dashboard_admin_read_parties"
on public.test_parties
for select
to authenticated
using (
  exists (
    select 1
    from public.dashboard_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "dashboard_admin_delete_parties" on public.test_parties;
create policy "dashboard_admin_delete_parties"
on public.test_parties
for delete
to authenticated
using (
  exists (
    select 1
    from public.dashboard_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "dashboard_admin_update_stats_flag" on public.test_parties;
create policy "dashboard_admin_update_stats_flag"
on public.test_parties
for update
to authenticated
using (
  exists (
    select 1
    from public.dashboard_admins a
    where a.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.dashboard_admins a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "dashboard_admin_read_questionnaires" on public.test_questionnaires;
create policy "dashboard_admin_read_questionnaires"
on public.test_questionnaires
for select
to authenticated
using (
  exists (
    select 1
    from public.dashboard_admins a
    where a.user_id = (select auth.uid())
  )
);

-- EXEMPLE À ADAPTER PUIS À EXÉCUTER APRÈS AVOIR CRÉÉ TON UTILISATEUR :
-- insert into public.dashboard_admins(user_id)
-- select id from auth.users where email = 'TON-EMAIL@EXEMPLE.FR'
-- on conflict (user_id) do nothing;
