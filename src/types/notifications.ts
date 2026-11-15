// CareCircle Phase 8A: Notification Infrastructure Domain Types

export type NotificationChannel = "email" | "sms" | "push";

export type NotificationEventType =
  | "medication_reminder"
  | "appointment_reminder"
  | "assistance_request"
  | "emergency_alert"
  | "schedule_update";

export type NotificationPurpose = NotificationEventType;

export type ConsentStatus = "granted" | "revoked" | "pending";

export type OutboxStatus =
  | "pending"
  | "processing"
  | "delivered"
  | "failed"
  | "cancelled";

export type DeliveryStatus = "sent" | "delivered" | "failed" | "bounced";

export interface DbNotificationPreferences {
  id: string;
  patient_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  medication_reminders_channels: NotificationChannel[];
  appointment_reminders_channels: NotificationChannel[];
  assistance_requests_channels: NotificationChannel[];
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbNotificationConsent {
  id: string;
  patient_id: string;
  recipient_type: "patient" | "caregiver" | "family_member";
  recipient_id: string | null;
  channel: NotificationChannel;
  purpose: NotificationPurpose;
  destination: string;
  status: ConsentStatus;
  granted_at: string;
  revoked_at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbNotificationSubscription {
  id: string;
  patient_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  user_agent?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbNotificationOutbox {
  id: string;
  patient_id: string;
  idempotency_key: string;
  event_type: NotificationEventType;
  channel: NotificationChannel;
  recipient_destination: string;
  recipient_name: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  related_alert_id?: string | null;
  status: OutboxStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  processed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbNotificationDelivery {
  id: string;
  outbox_id: string;
  patient_id: string;
  channel: NotificationChannel;
  provider: string;
  provider_message_id?: string | null;
  status: DeliveryStatus;
  error_code?: string | null;
  error_message?: string | null;
  latency_ms?: number | null;
  raw_response?: Record<string, unknown> | null;
  created_at?: string;
}

// Provider-neutral abstractions
export interface NotificationPayload {
  to: string;
  recipientName: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  isUrgent?: boolean;
  metadata?: Record<string, unknown>;
}

export interface NotificationProviderResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  latencyMs: number;
  raw?: unknown;
}

export interface INotificationProvider {
  name: string;
  channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<NotificationProviderResult>;
}
