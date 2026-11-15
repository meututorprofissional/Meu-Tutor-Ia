-- Execute no SQL Editor do seu projeto Supabase.
-- Esta tabela guarda os dados de estudo de cada usuário autenticado.
-- Row Level Security garante que cada conta só acesse a própria linha.

create table if not exists public.user_study_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  data jsonb not null default '{"topics":[],"cards":[],"attempts":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_study_data enable row level security;

drop policy if exists "Users can read own study data" on public.user_study_data;
create policy "Users can read own study data"
  on public.user_study_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own study data" on public.user_study_data;
create policy "Users can insert own study data"
  on public.user_study_data for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own study data" on public.user_study_data;
create policy "Users can update own study data"
  on public.user_study_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.user_study_data to authenticated;
