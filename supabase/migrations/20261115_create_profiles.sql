-- CareCircle Phase 2: Patient Healthcare Profiles Migration
-- Schema for personal patient profile and emergency contact information with Row Level Security (RLS)

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  date_of_birth date,
  phone_number text,
  gender text,
  avatar_url text,
  blood_group text,
  allergies text[],
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. RLS Policies (Strict Patient Isolation - users can ONLY access their own profile)
-- Ensure clean slate for re-running migration
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Note: No DELETE policy is defined. In Supabase RLS, absent policies default to DENY.
-- Profiles can only be deleted when the parent auth.users account is removed (via CASCADE).

-- 4. Automatic timestamp updater trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- 5. Auto-create patient profile trigger on user registration
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone_number,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Patient'),
    nullif(trim(new.raw_user_meta_data->>'phone_number'), ''),
    nullif(trim(new.raw_user_meta_data->>'emergency_contact_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'emergency_contact_relationship'), ''),
    nullif(trim(new.raw_user_meta_data->>'emergency_contact_phone'), '')
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    -- Never abort auth.users creation if profile insert encounters an edge-case error.
    -- Log warning in Postgres log; the patient profile can be created/updated upon first login.
    raise warning 'CareCircle profile auto-creation notice for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
