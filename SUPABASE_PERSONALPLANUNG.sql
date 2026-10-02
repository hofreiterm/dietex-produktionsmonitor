create table if not exists public.personnel_planning_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.personnel_planning_state enable row level security;

drop policy if exists "personnel planning read" on public.personnel_planning_state;
create policy "personnel planning read"
on public.personnel_planning_state
for select
to anon, authenticated
using (id = 'main');

drop policy if exists "personnel planning insert" on public.personnel_planning_state;
create policy "personnel planning insert"
on public.personnel_planning_state
for insert
to anon, authenticated
with check (id = 'main');

drop policy if exists "personnel planning update" on public.personnel_planning_state;
create policy "personnel planning update"
on public.personnel_planning_state
for update
to anon, authenticated
using (id = 'main')
with check (id = 'main');

do $$
begin
  alter publication supabase_realtime add table public.personnel_planning_state;
exception
  when duplicate_object then null;
end $$;
