-- CareCircle Phase 5: Smart Alerts, Escalation & Alert Preferences Migration
-- Provides persistent in-app notifications for medication schedules, doctor appointments,
-- and patient-controlled assistance escalation workflows.

-- 1. Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('medication', 'appointment', 'assistance')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
    related_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'snoozed', 'resolved', 'cancelled')),
    acknowledged_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    escalation_status TEXT NOT NULL DEFAULT 'not_required' CHECK (escalation_status IN ('not_required', 'waiting', 'escalated', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Partial unique indexes to prevent duplicate alert generation
-- Only one alert per medication dose scheduled time per patient
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_medication_alert 
ON public.alerts (patient_id, related_medication_id, scheduled_for) 
WHERE (type = 'medication' AND related_medication_id IS NOT NULL);

-- Only one alert per appointment per patient
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_appointment_alert 
ON public.alerts (patient_id, related_appointment_id) 
WHERE (type = 'appointment' AND related_appointment_id IS NOT NULL);

-- Performance query indexes
CREATE INDEX IF NOT EXISTS idx_alerts_patient_status 
ON public.alerts (patient_id, status);

CREATE INDEX IF NOT EXISTS idx_alerts_patient_scheduled 
ON public.alerts (patient_id, scheduled_for);

-- 2. Create alert_preferences table
CREATE TABLE IF NOT EXISTS public.alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    medication_reminders BOOLEAN NOT NULL DEFAULT true,
    appointment_reminders BOOLEAN NOT NULL DEFAULT true,
    assistance_escalation_enabled BOOLEAN NOT NULL DEFAULT true,
    preferred_care_circle_contact_id UUID REFERENCES public.care_circle_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_alert_preferences_patient_id 
ON public.alert_preferences (patient_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for alerts
CREATE POLICY "Patients can view own alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert own alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can delete own alerts"
ON public.alerts
FOR DELETE
TO authenticated
USING (patient_id = auth.uid());

-- 5. RLS Policies for alert_preferences
CREATE POLICY "Patients can view own alert preferences"
ON public.alert_preferences
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert own alert preferences"
ON public.alert_preferences
FOR INSERT
TO authenticated
WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own alert preferences"
ON public.alert_preferences
FOR UPDATE
TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can delete own alert preferences"
ON public.alert_preferences
FOR DELETE
TO authenticated
USING (patient_id = auth.uid());

-- 6. Updated at triggers
CREATE TRIGGER set_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_alert_preferences_updated_at
BEFORE UPDATE ON public.alert_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
