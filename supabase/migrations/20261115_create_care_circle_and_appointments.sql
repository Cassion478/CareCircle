-- ============================================================================
-- CareCircle Migration: Family Care Circle & Appointments (Phase 4)
-- ============================================================================

-- 1. Create care_circle_members Table
create table if not exists public.care_circle_members (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  member_name text not null,
  relationship text not null,
  email text,
  phone_number text,
  role text not null check (role in ('caregiver', 'emergency_contact')) default 'caregiver',
  status text not null check (status in ('pending', 'active', 'revoked')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast patient-scoped lookup
create index if not exists idx_care_circle_patient_id on public.care_circle_members(patient_id);
create index if not exists idx_care_circle_status on public.care_circle_members(patient_id, status);

-- 2. Create appointments Table
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  doctor_name text,
  location text,
  appointment_date date not null,
  appointment_time time not null,
  notes text,
  status text not null check (status in ('scheduled', 'completed', 'cancelled')) default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for appointments
create index if not exists idx_appointments_patient_id on public.appointments(patient_id);
create index if not exists idx_appointments_date on public.appointments(patient_id, appointment_date, appointment_time);

-- 3. Updated At Triggers
drop trigger if exists set_care_circle_updated_at on public.care_circle_members;
create trigger set_care_circle_updated_at
  before update on public.care_circle_members
  for each row
  execute function public.handle_updated_at();

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
  before update on public.appointments
  for each row
  execute function public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
alter table public.care_circle_members enable row level security;
alter table public.appointments enable row level security;

-- 5. RLS Policies: care_circle_members
-- Strictly enforces that patients only access and manage their own Care Circle members
drop policy if exists "Patients can view own care circle members" on public.care_circle_members;
create policy "Patients can view own care circle members"
  on public.care_circle_members for select
  using (patient_id = auth.uid());

drop policy if exists "Patients can insert own care circle members" on public.care_circle_members;
create policy "Patients can insert own care circle members"
  on public.care_circle_members for insert
  with check (patient_id = auth.uid());

drop policy if exists "Patients can update own care circle members" on public.care_circle_members;
create policy "Patients can update own care circle members"
  on public.care_circle_members for update
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

drop policy if exists "Patients can delete own care circle members" on public.care_circle_members;
create policy "Patients can delete own care circle members"
  on public.care_circle_members for delete
  using (patient_id = auth.uid());

-- 6. RLS Policies: appointments
-- Strictly enforces that patients only access and manage their own appointments
drop policy if exists "Patients can view own appointments" on public.appointments;
create policy "Patients can view own appointments"
  on public.appointments for select
  using (patient_id = auth.uid());

drop policy if exists "Patients can insert own appointments" on public.appointments;
create policy "Patients can insert own appointments"
  on public.appointments for insert
  with check (patient_id = auth.uid());

drop policy if exists "Patients can update own appointments" on public.appointments;
create policy "Patients can update own appointments"
  on public.appointments for update
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

drop policy if exists "Patients can delete own appointments" on public.appointments;
create policy "Patients can delete own appointments"
  on public.appointments for delete
  using (patient_id = auth.uid());
