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
  role text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists role text not null default 'student';

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check check (role in ('student', 'admin'));

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
  reminder_offset_minutes integer,
  reminder_sent_at timestamptz,
  priority text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academic_events
add column if not exists reminder_offset_minutes integer;

alter table public.academic_events
add column if not exists reminder_sent_at timestamptz;

alter table public.academic_events
drop constraint if exists academic_events_reminder_offset_minutes_check;

alter table public.academic_events
add constraint academic_events_reminder_offset_minutes_check
check (
  reminder_offset_minutes is null
  or (
    reminder_offset_minutes >= 0
    and reminder_offset_minutes <= 525600
  )
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
  image_path text,
  image_prompt text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.generated_materials add column if not exists image_path text;
alter table public.generated_materials add column if not exists image_prompt text;

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

create table if not exists public.user_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_key text not null,
  entity_type text,
  entity_id uuid,
  title text not null,
  detail text,
  metadata jsonb,
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

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-files',
  'study-files',
  false,
  10485760,
  null
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

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
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
alter table public.user_activity_logs enable row level security;
alter table public.billing_events enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
for delete using (auth.uid() = id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
for select using (auth.uid() = user_id);
create policy "subscriptions_insert_own" on public.subscriptions
for insert with check (auth.uid() = user_id);
create policy "subscriptions_update_own" on public.subscriptions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_delete_own" on public.subscriptions
for delete using (auth.uid() = user_id);

drop policy if exists "ai_trials_select_own" on public.ai_trials;
drop policy if exists "ai_trials_insert_own" on public.ai_trials;
drop policy if exists "ai_trials_update_own" on public.ai_trials;
drop policy if exists "ai_trials_delete_own" on public.ai_trials;
create policy "ai_trials_select_own" on public.ai_trials
for select using (auth.uid() = user_id);
create policy "ai_trials_insert_own" on public.ai_trials
for insert with check (auth.uid() = user_id);
create policy "ai_trials_update_own" on public.ai_trials
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_trials_delete_own" on public.ai_trials
for delete using (auth.uid() = user_id);

drop policy if exists "ai_monthly_usage_select_own" on public.ai_monthly_usage;
drop policy if exists "ai_monthly_usage_insert_own" on public.ai_monthly_usage;
drop policy if exists "ai_monthly_usage_update_own" on public.ai_monthly_usage;
drop policy if exists "ai_monthly_usage_delete_own" on public.ai_monthly_usage;
create policy "ai_monthly_usage_select_own" on public.ai_monthly_usage
for select using (auth.uid() = user_id);
create policy "ai_monthly_usage_insert_own" on public.ai_monthly_usage
for insert with check (auth.uid() = user_id);
create policy "ai_monthly_usage_update_own" on public.ai_monthly_usage
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_monthly_usage_delete_own" on public.ai_monthly_usage
for delete using (auth.uid() = user_id);

drop policy if exists "ai_usage_logs_select_own" on public.ai_usage_logs;
drop policy if exists "ai_usage_logs_insert_own" on public.ai_usage_logs;
drop policy if exists "ai_usage_logs_update_own" on public.ai_usage_logs;
drop policy if exists "ai_usage_logs_delete_own" on public.ai_usage_logs;
create policy "ai_usage_logs_select_own" on public.ai_usage_logs
for select using (auth.uid() = user_id);
create policy "ai_usage_logs_insert_own" on public.ai_usage_logs
for insert with check (auth.uid() = user_id);
create policy "ai_usage_logs_update_own" on public.ai_usage_logs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_usage_logs_delete_own" on public.ai_usage_logs
for delete using (auth.uid() = user_id);

drop policy if exists "subjects_select_own" on public.subjects;
drop policy if exists "subjects_insert_own" on public.subjects;
drop policy if exists "subjects_update_own" on public.subjects;
drop policy if exists "subjects_delete_own" on public.subjects;
create policy "subjects_select_own" on public.subjects
for select using (auth.uid() = user_id);
create policy "subjects_insert_own" on public.subjects
for insert with check (auth.uid() = user_id);
create policy "subjects_update_own" on public.subjects
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subjects_delete_own" on public.subjects
for delete using (auth.uid() = user_id);

drop policy if exists "academic_events_select_own" on public.academic_events;
drop policy if exists "academic_events_insert_own" on public.academic_events;
drop policy if exists "academic_events_update_own" on public.academic_events;
drop policy if exists "academic_events_delete_own" on public.academic_events;
create policy "academic_events_select_own" on public.academic_events
for select using (auth.uid() = user_id);
create policy "academic_events_insert_own" on public.academic_events
for insert with check (auth.uid() = user_id);
create policy "academic_events_update_own" on public.academic_events
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "academic_events_delete_own" on public.academic_events
for delete using (auth.uid() = user_id);

drop policy if exists "study_files_select_own" on public.study_files;
drop policy if exists "study_files_insert_own" on public.study_files;
drop policy if exists "study_files_update_own" on public.study_files;
drop policy if exists "study_files_delete_own" on public.study_files;
create policy "study_files_select_own" on public.study_files
for select using (auth.uid() = user_id);
create policy "study_files_insert_own" on public.study_files
for insert with check (auth.uid() = user_id);
create policy "study_files_update_own" on public.study_files
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_files_delete_own" on public.study_files
for delete using (auth.uid() = user_id);

drop policy if exists "generated_materials_select_own" on public.generated_materials;
drop policy if exists "generated_materials_insert_own" on public.generated_materials;
drop policy if exists "generated_materials_update_own" on public.generated_materials;
drop policy if exists "generated_materials_delete_own" on public.generated_materials;
create policy "generated_materials_select_own" on public.generated_materials
for select using (auth.uid() = user_id);
create policy "generated_materials_insert_own" on public.generated_materials
for insert with check (auth.uid() = user_id);
create policy "generated_materials_update_own" on public.generated_materials
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "generated_materials_delete_own" on public.generated_materials
for delete using (auth.uid() = user_id);

drop policy if exists "ai_conversations_select_own" on public.ai_conversations;
drop policy if exists "ai_conversations_insert_own" on public.ai_conversations;
drop policy if exists "ai_conversations_update_own" on public.ai_conversations;
drop policy if exists "ai_conversations_delete_own" on public.ai_conversations;
create policy "ai_conversations_select_own" on public.ai_conversations
for select using (auth.uid() = user_id);
create policy "ai_conversations_insert_own" on public.ai_conversations
for insert with check (auth.uid() = user_id);
create policy "ai_conversations_update_own" on public.ai_conversations
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_conversations_delete_own" on public.ai_conversations
for delete using (auth.uid() = user_id);

drop policy if exists "ai_messages_select_own" on public.ai_messages;
drop policy if exists "ai_messages_insert_own" on public.ai_messages;
drop policy if exists "ai_messages_update_own" on public.ai_messages;
drop policy if exists "ai_messages_delete_own" on public.ai_messages;
create policy "ai_messages_select_own" on public.ai_messages
for select using (auth.uid() = user_id);
create policy "ai_messages_insert_own" on public.ai_messages
for insert with check (auth.uid() = user_id);
create policy "ai_messages_update_own" on public.ai_messages
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_messages_delete_own" on public.ai_messages
for delete using (auth.uid() = user_id);

drop policy if exists "user_activity_logs_select_own" on public.user_activity_logs;
drop policy if exists "user_activity_logs_insert_own" on public.user_activity_logs;
drop policy if exists "user_activity_logs_update_own" on public.user_activity_logs;
drop policy if exists "user_activity_logs_delete_own" on public.user_activity_logs;
create policy "user_activity_logs_select_own" on public.user_activity_logs
for select using (auth.uid() = user_id);
create policy "user_activity_logs_insert_own" on public.user_activity_logs
for insert with check (auth.uid() = user_id);
create policy "user_activity_logs_update_own" on public.user_activity_logs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_activity_logs_delete_own" on public.user_activity_logs
for delete using (auth.uid() = user_id);

drop policy if exists "billing_events_select_own" on public.billing_events;
create policy "billing_events_select_own" on public.billing_events
for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions
for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_update_own" on public.push_subscriptions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions
for delete using (auth.uid() = user_id);

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
