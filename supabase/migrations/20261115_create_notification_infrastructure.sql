-- ============================================================================
-- CareCircle Phase 8A: Production Notification Infrastructure Migration
-- ============================================================================
-- Multi-channel foundation (Email, SMS, Web Push) with:
-- 1. Patient notification preferences (channel & event configuration)
-- 2. Explicit recipient consent tracking & revocation audit log
-- 3. Web Push browser subscriptions
-- 4. Asynchronous notification outbox with idempotency & retry control
-- 5. Notification delivery attempt logs & latency audit
-- ============================================================================

-- 1. Create notification_preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    medication_reminders_channels TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[],
    appointment_reminders_channels TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[],
    assistance_requests_channels TEXT[] NOT NULL DEFAULT ARRAY['email', 'sms']::TEXT[],
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME WITHOUT TIME ZONE DEFAULT '22:00',
    quiet_hours_end TIME WITHOUT TIME ZONE DEFAULT '07:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_patient_id
ON public.notification_preferences (patient_id);

-- 2. Create notification_consents Table (Explicit Consent & Revocation)
CREATE TABLE IF NOT EXISTS public.notification_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('patient', 'caregiver', 'family_member')),
    recipient_id UUID REFERENCES public.care_circle_members(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    purpose TEXT NOT NULL CHECK (purpose IN ('medication_reminder', 'appointment_reminder', 'assistance_request', 'emergency_alert', 'schedule_update')),
    destination TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'granted' CHECK (status IN ('granted', 'revoked', 'pending')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    revoked_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_notification_consent UNIQUE (patient_id, destination, channel, purpose)
);

CREATE INDEX IF NOT EXISTS idx_notification_consents_lookup
ON public.notification_consents (patient_id, channel, status);

-- 3. Create notification_subscriptions Table (Browser Push Subscriptions)
CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_patient
ON public.notification_subscriptions (patient_id, is_active);

-- 4. Create notification_outbox Table (Reliable Asynchronous Outbox)
CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL CHECK (event_type IN ('medication_reminder', 'appointment_reminder', 'assistance_request', 'emergency_alert', 'schedule_update')),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    recipient_destination TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    related_alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_process
ON public.notification_outbox (status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_patient
ON public.notification_outbox (patient_id, status);

-- 5. Create notification_deliveries Table (Delivery History & Latency Log)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outbox_id UUID NOT NULL REFERENCES public.notification_outbox(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    provider TEXT NOT NULL,
    provider_message_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
    error_code TEXT,
    error_message TEXT,
    latency_ms INT,
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_outbox
ON public.notification_deliveries (outbox_id);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_patient
ON public.notification_deliveries (patient_id, created_at);

-- 6. Updated At Triggers
DROP TRIGGER IF EXISTS set_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_notification_consents_updated_at ON public.notification_consents;
CREATE TRIGGER set_notification_consents_updated_at
    BEFORE UPDATE ON public.notification_consents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_notification_subscriptions_updated_at ON public.notification_subscriptions;
CREATE TRIGGER set_notification_subscriptions_updated_at
    BEFORE UPDATE ON public.notification_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_notification_outbox_updated_at ON public.notification_outbox;
CREATE TRIGGER set_notification_outbox_updated_at
    BEFORE UPDATE ON public.notification_outbox
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Enable Row Level Security (RLS) on All Tables
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- 8. Strict Patient-Scoped RLS Policies

-- notification_preferences
CREATE POLICY "Patients can view own notification preferences"
ON public.notification_preferences FOR SELECT
TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Patients can insert own notification preferences"
ON public.notification_preferences FOR INSERT
TO authenticated WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own notification preferences"
ON public.notification_preferences FOR UPDATE
TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());

-- notification_consents
CREATE POLICY "Patients can view own notification consents"
ON public.notification_consents FOR SELECT
TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Patients can manage own notification consents"
ON public.notification_consents FOR INSERT
TO authenticated WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own notification consents"
ON public.notification_consents FOR UPDATE
TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can delete own notification consents"
ON public.notification_consents FOR DELETE
TO authenticated USING (patient_id = auth.uid());

-- notification_subscriptions
CREATE POLICY "Patients can view own push subscriptions"
ON public.notification_subscriptions FOR SELECT
TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Patients can register own push subscriptions"
ON public.notification_subscriptions FOR INSERT
TO authenticated WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own push subscriptions"
ON public.notification_subscriptions FOR UPDATE
TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can delete own push subscriptions"
ON public.notification_subscriptions FOR DELETE
TO authenticated USING (patient_id = auth.uid());

-- notification_outbox
CREATE POLICY "Patients can view own notification outbox"
ON public.notification_outbox FOR SELECT
TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Patients can queue notification outbox jobs"
ON public.notification_outbox FOR INSERT
TO authenticated WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own outbox jobs"
ON public.notification_outbox FOR UPDATE
TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());

-- notification_deliveries
CREATE POLICY "Patients can view own notification delivery logs"
ON public.notification_deliveries FOR SELECT
TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Patients can log notification delivery attempts"
ON public.notification_deliveries FOR INSERT
TO authenticated WITH CHECK (patient_id = auth.uid());

-- 9. Concurrency-Safe Atomic Job Claiming Function
-- Employs FOR UPDATE SKIP LOCKED to prevent race conditions across concurrent workers.
-- Ensures strict at-most-once delivery by atomically locking and transitioning pending jobs.
-- SECURITY DEFINER allows background queue workers to query and claim pending jobs,
-- while EXECUTE permission is strictly restricted to service_role.
CREATE OR REPLACE FUNCTION public.claim_next_notification_jobs(
    p_batch_size INT DEFAULT 10
)
RETURNS SETOF public.notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clamped_limit INT;
BEGIN
    -- Clamp batch size between 1 and 100 to prevent DoS or accidental bulk table locking
    v_clamped_limit := GREATEST(1, LEAST(COALESCE(p_batch_size, 10), 100));

    RETURN QUERY
    WITH candidate_jobs AS (
        SELECT id
        FROM public.notification_outbox
        WHERE status = 'pending'
          AND next_retry_at <= timezone('utc'::text, now())
        ORDER BY next_retry_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT v_clamped_limit
    )
    UPDATE public.notification_outbox o
    SET status = 'processing',
        processed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    FROM candidate_jobs c
    WHERE o.id = c.id
    RETURNING o.*;
END;
$$;

-- Restrict execution to service_role (background workers / pg_cron) ONLY.
-- Standard PostgreSQL grants EXECUTE to PUBLIC by default.
-- We explicitly revoke from PUBLIC, anon, and authenticated so ordinary patients cannot claim jobs.
REVOKE ALL ON FUNCTION public.claim_next_notification_jobs(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_next_notification_jobs(INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_notification_jobs(INT) TO service_role;
