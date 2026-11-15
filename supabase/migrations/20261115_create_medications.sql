-- CareCircle Phase 3: Persistent Medication Management Migration
-- Schema for patient medication regimens and scheduled dose execution logs with strict Row Level Security (RLS)

-- 1. Create medications table
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  dosage text not null,
  instructions text,
  start_date date not null default current_date,
  end_date date,
  scheduled_times text[] not null default array['08:00']::text[],
  is_active boolean not null default true,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  constraint valid_dates check (end_date is null or end_date >= start_date)
);

-- 2. Create medication_dose_logs table
create table if not exists public.medication_dose_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references public.medications(id) on delete cascade not null,
  patient_id uuid references public.profiles(id) on delete cascade not null,
  scheduled_for timestamptz not null,
  status text not null check (status in ('pending', 'taken', 'snoozed', 'need_help')),
  taken_at timestamptz,
  snoozed_until timestamptz,
  note text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  -- Prevent duplicate dose records for the same medication and scheduled occurrence
  constraint unique_medication_dose_occurrence unique (medication_id, scheduled_for)
);

-- 3. Indexes for high-performance patient queries
create index if not exists idx_medications_patient_id on public.medications(patient_id);
create index if not exists idx_medications_active on public.medications(patient_id, is_active);
create index if not exists idx_dose_logs_patient_scheduled on public.medication_dose_logs(patient_id, scheduled_for desc);
create index if not exists idx_dose_logs_medication_scheduled on public.medication_dose_logs(medication_id, scheduled_for desc);

-- 4. Enable Row Level Security (RLS)
alter table public.medications enable row level security;
alter table public.medication_dose_logs enable row level security;

-- 5. RLS Policies for public.medications
drop policy if exists "Patients can view own medications" on public.medications;
drop policy if exists "Patients can insert own medications" on public.medications;
drop policy if exists "Patients can update own medications" on public.medications;
drop policy if exists "Patients can delete own medications" on public.medications;

create policy "Patients can view own medications"
  on public.medications for select
  using (patient_id = auth.uid());

create policy "Patients can insert own medications"
  on public.medications for insert
  with check (patient_id = auth.uid());

create policy "Patients can update own medications"
  on public.medications for update
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "Patients can delete own medications"
  on public.medications for delete
  using (patient_id = auth.uid());

-- 6. RLS Policies for public.medication_dose_logs
drop policy if exists "Patients can view own dose logs" on public.medication_dose_logs;
drop policy if exists "Patients can insert own dose logs" on public.medication_dose_logs;
drop policy if exists "Patients can update own dose logs" on public.medication_dose_logs;
drop policy if exists "Patients can delete own dose logs" on public.medication_dose_logs;

create policy "Patients can view own dose logs"
  on public.medication_dose_logs for select
  using (patient_id = auth.uid());

-- Prevent inserting dose log for another patient's medication
create policy "Patients can insert own dose logs"
  on public.medication_dose_logs for insert
  with check (
    patient_id = auth.uid() and
    exists (
      select 1 from public.medications m
      where m.id = medication_id and m.patient_id = auth.uid()
    )
  );

create policy "Patients can update own dose logs"
  on public.medication_dose_logs for update
  using (patient_id = auth.uid())
  with check (
    patient_id = auth.uid() and
    exists (
      select 1 from public.medications m
      where m.id = medication_id and m.patient_id = auth.uid()
    )
  );

create policy "Patients can delete own dose logs"
  on public.medication_dose_logs for delete
  using (patient_id = auth.uid());

-- 7. Automatic updated_at triggers
drop trigger if exists on_medications_updated on public.medications;
create trigger on_medications_updated
  before update on public.medications
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_medication_dose_logs_updated on public.medication_dose_logs;
create trigger on_medication_dose_logs_updated
  before update on public.medication_dose_logs
  for each row execute procedure public.handle_updated_at();
