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

grant select on public.dashboard_admins to authenticated;
grant select on public.test_parties to authenticated;
grant select on public.test_questionnaires to authenticated;

drop policy if exists "dashboard_admin_read_self" on public.dashboard_admins;
create policy "dashboard_admin_read_self"
on public.dashboard_admins
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "dashboard_admin_read_parties" on public.test_parties;
create policy "dashboard_admin_read_parties"
on public.test_parties
for select
to authenticated
using (
  exists (
    select 1
    from public.dashboard_admins a
    where a.user_id = auth.uid()
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
    where a.user_id = auth.uid()
  )
);

-- EXEMPLE À ADAPTER PUIS À EXÉCUTER APRÈS AVOIR CRÉÉ TON UTILISATEUR :
-- insert into public.dashboard_admins(user_id)
-- select id from auth.users where email = 'TON-EMAIL@EXEMPLE.FR'
-- on conflict (user_id) do nothing;
