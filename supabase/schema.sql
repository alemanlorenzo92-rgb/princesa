create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null default 'trial' check (plan_id in ('trial', 'expired_trial', 'student', 'pro')),
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_trials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  input_tokens_limit integer not null default 10000,
  output_tokens_limit integer not null default 4000,
  input_tokens_used integer not null default 0,
  output_tokens_used integer not null default 0,
  total_tokens_used integer not null default 0,
  openai_uses integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_monthly_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  plan_id text not null check (plan_id in ('student', 'pro')),
  input_tokens_used integer not null default 0,
  output_tokens_used integer not null default 0,
  total_tokens_used integer not null default 0,
  openai_uses integer not null default 0,
  estimated_cost_usd numeric not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month, plan_id)
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  feature_key text,
  material_type text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  teacher text,
  schedule text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  type text,
  event_date date not null,
  event_time time,
  priority text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  file_url text,
  file_path text,
  original_filename text,
  extracted_text text,
  manual_text text,
  file_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generated_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  file_id uuid references public.study_files(id) on delete set null,
  title text not null,
  material_type text,
  detail_level text,
  style text,
  content text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  file_id uuid references public.study_files(id) on delete set null,
  title text not null default 'Nueva conversacion',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan_id text,
  provider text not null default 'mercadopago',
  provider_event_id text,
  provider_payment_id text,
  status text,
  raw_event jsonb,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-files',
  'study-files',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists ai_trials_set_updated_at on public.ai_trials;
create trigger ai_trials_set_updated_at before update on public.ai_trials
for each row execute function public.set_updated_at();

drop trigger if exists ai_monthly_usage_set_updated_at on public.ai_monthly_usage;
create trigger ai_monthly_usage_set_updated_at before update on public.ai_monthly_usage
for each row execute function public.set_updated_at();

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at before update on public.subjects
for each row execute function public.set_updated_at();

drop trigger if exists academic_events_set_updated_at on public.academic_events;
create trigger academic_events_set_updated_at before update on public.academic_events
for each row execute function public.set_updated_at();

drop trigger if exists study_files_set_updated_at on public.study_files;
create trigger study_files_set_updated_at before update on public.study_files
for each row execute function public.set_updated_at();

drop trigger if exists generated_materials_set_updated_at on public.generated_materials;
create trigger generated_materials_set_updated_at before update on public.generated_materials
for each row execute function public.set_updated_at();

drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at before update on public.ai_conversations
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));

  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'trial', 'active');

  insert into public.ai_trials (
    user_id,
    status,
    input_tokens_limit,
    output_tokens_limit,
    input_tokens_used,
    output_tokens_used,
    total_tokens_used,
    openai_uses
  )
  values (
    new.id,
    'active',
    10000,
    4000,
    0,
    0,
    0,
    0
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_trials enable row level security;
alter table public.ai_monthly_usage enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.subjects enable row level security;
alter table public.academic_events enable row level security;
alter table public.study_files enable row level security;
alter table public.generated_materials enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.billing_events enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = id);

create policy "subscriptions_select_own" on public.subscriptions
for select using (auth.uid() = user_id);
create policy "subscriptions_insert_own" on public.subscriptions
for insert with check (auth.uid() = user_id);
create policy "subscriptions_update_own" on public.subscriptions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_delete_own" on public.subscriptions
for delete using (auth.uid() = user_id);

create policy "ai_trials_select_own" on public.ai_trials
for select using (auth.uid() = user_id);
create policy "ai_trials_insert_own" on public.ai_trials
for insert with check (auth.uid() = user_id);
create policy "ai_trials_update_own" on public.ai_trials
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_trials_delete_own" on public.ai_trials
for delete using (auth.uid() = user_id);

create policy "ai_monthly_usage_select_own" on public.ai_monthly_usage
for select using (auth.uid() = user_id);
create policy "ai_monthly_usage_insert_own" on public.ai_monthly_usage
for insert with check (auth.uid() = user_id);
create policy "ai_monthly_usage_update_own" on public.ai_monthly_usage
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_monthly_usage_delete_own" on public.ai_monthly_usage
for delete using (auth.uid() = user_id);

create policy "ai_usage_logs_select_own" on public.ai_usage_logs
for select using (auth.uid() = user_id);
create policy "ai_usage_logs_insert_own" on public.ai_usage_logs
for insert with check (auth.uid() = user_id);
create policy "ai_usage_logs_update_own" on public.ai_usage_logs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_usage_logs_delete_own" on public.ai_usage_logs
for delete using (auth.uid() = user_id);

create policy "subjects_select_own" on public.subjects
for select using (auth.uid() = user_id);
create policy "subjects_insert_own" on public.subjects
for insert with check (auth.uid() = user_id);
create policy "subjects_update_own" on public.subjects
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subjects_delete_own" on public.subjects
for delete using (auth.uid() = user_id);

create policy "academic_events_select_own" on public.academic_events
for select using (auth.uid() = user_id);
create policy "academic_events_insert_own" on public.academic_events
for insert with check (auth.uid() = user_id);
create policy "academic_events_update_own" on public.academic_events
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "academic_events_delete_own" on public.academic_events
for delete using (auth.uid() = user_id);

create policy "study_files_select_own" on public.study_files
for select using (auth.uid() = user_id);
create policy "study_files_insert_own" on public.study_files
for insert with check (auth.uid() = user_id);
create policy "study_files_update_own" on public.study_files
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_files_delete_own" on public.study_files
for delete using (auth.uid() = user_id);

create policy "generated_materials_select_own" on public.generated_materials
for select using (auth.uid() = user_id);
create policy "generated_materials_insert_own" on public.generated_materials
for insert with check (auth.uid() = user_id);
create policy "generated_materials_update_own" on public.generated_materials
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generated_materials_delete_own" on public.generated_materials
for delete using (auth.uid() = user_id);

create policy "ai_conversations_select_own" on public.ai_conversations
for select using (auth.uid() = user_id);
create policy "ai_conversations_insert_own" on public.ai_conversations
for insert with check (auth.uid() = user_id);
create policy "ai_conversations_update_own" on public.ai_conversations
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_conversations_delete_own" on public.ai_conversations
for delete using (auth.uid() = user_id);

create policy "ai_messages_select_own" on public.ai_messages
for select using (auth.uid() = user_id);
create policy "ai_messages_insert_own" on public.ai_messages
for insert with check (auth.uid() = user_id);
create policy "ai_messages_update_own" on public.ai_messages
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_messages_delete_own" on public.ai_messages
for delete using (auth.uid() = user_id);

create policy "billing_events_select_own" on public.billing_events
for select using (auth.uid() = user_id);

drop policy if exists "study_files_storage_select_own" on storage.objects;
drop policy if exists "study_files_storage_insert_own" on storage.objects;
drop policy if exists "study_files_storage_update_own" on storage.objects;
drop policy if exists "study_files_storage_delete_own" on storage.objects;

create policy "study_files_storage_select_own" on storage.objects
for select using (
  bucket_id = 'study-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "study_files_storage_insert_own" on storage.objects
for insert with check (
  bucket_id = 'study-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "study_files_storage_update_own" on storage.objects
for update using (
  bucket_id = 'study-files'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'study-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "study_files_storage_delete_own" on storage.objects
for delete using (
  bucket_id = 'study-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);
