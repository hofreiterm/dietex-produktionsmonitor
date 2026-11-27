begin;

create table if not exists public.personnel_leave_editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.personnel_leave_days (
  day date not null,
  department text not null check (department in ('waescherei', 'putzerei')),
  employee_name text not null check (char_length(btrim(employee_name)) between 1 and 160),
  status text not null check (status in ('urlaub', 'za', 'krank', 'sonstiges', 'angefragt')),
  primary key (day, department, employee_name)
);

alter table public.personnel_leave_editors enable row level security;
alter table public.personnel_leave_days enable row level security;
revoke all on public.personnel_leave_editors, public.personnel_leave_days from public, anon, authenticated;
grant select on public.personnel_leave_editors to authenticated;
grant select, insert, update, delete on public.personnel_leave_days to authenticated;

drop policy if exists "Read own leave permission" on public.personnel_leave_editors;
create policy "Read own leave permission" on public.personnel_leave_editors
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Manage leave calendar" on public.personnel_leave_days;
create policy "Manage leave calendar" on public.personnel_leave_days
for all to authenticated
using (exists (
  select 1 from public.personnel_leave_editors where user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.personnel_leave_editors where user_id = (select auth.uid())
));

-- Expose only the setup flag so that unsigned planners cannot bypass absences.
create or replace function public.personnel_leave_planning_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.personnel_leave_editors);
$$;
revoke all on function public.personnel_leave_planning_required() from public, anon, authenticated;
grant execute on function public.personnel_leave_planning_required() to anon, authenticated;

commit;

-- Grant access only to existing planning accounts selected by the company.
-- Replace the example email with the exact login email in Supabase Auth.
-- insert into public.personnel_leave_editors (user_id)
-- select id from auth.users where lower(email) = lower('planung@example.com')
-- on conflict do nothing;
