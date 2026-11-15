// CareCircle Phase 8A: Notification Outbox & Job Creation Engine
// Coordinates patient channel preferences, recipient consent, privacy masking,
// and idempotency to safely queue notification jobs into `public.notification_outbox`.

import {
  DbNotificationPreferences,
  DbNotificationConsent,
  DbNotificationOutbox,
  NotificationChannel,
  NotificationEventType,
  NotificationPayload,
  NotificationProviderResult,
  INotificationProvider,
} from "@/types/notifications";
import { DbCareCircleMember } from "@/types";
import { sanitizeNotificationPayload } from "./privacy";
import {
  authorizeNotificationDispatch,
  checkRecipientConsent,
  authorizeCaregiverRecipient,
} from "./consent";
import { buildNotificationIdempotencyKey } from "./idempotency";
import { evaluateNotificationRetry } from "./retry";

export interface QueueNotificationJobInput {
  patientId: string;
  patientName: string;
  eventType: NotificationEventType;
  referenceId: string; // medication_id, appointment_id, etc.
  scheduledTimeOrDate: string;
  relatedAlertId?: string | null;
  rawDetails?: {
    medicationName?: string;
    dosage?: string;
    appointmentTitle?: string;
    doctorName?: string;
    assistanceReason?: string;
  };
  recipient: {
    name: string;
    destination: string;
    isCaregiver: boolean;
    caregiverId?: string | null;
  };
  preferences: DbNotificationPreferences;
  consents: DbNotificationConsent[];
  careCircleMembers: DbCareCircleMember[];
}

export interface QueueJobResult {
  queued: boolean;
  channel: NotificationChannel;
  job?: Omit<DbNotificationOutbox, "id" | "created_at" | "updated_at">;
  rejectedReason?: string;
}

/**
 * Determines which channels are active for a given event type based on patient preferences.
 */
export function getActiveChannelsForEvent(
  eventType: NotificationEventType,
  preferences: DbNotificationPreferences
): NotificationChannel[] {
  const activeChannels: NotificationChannel[] = [];

  // Check event-specific channels against global master switches
  let candidateChannels: NotificationChannel[] = [];
  if (eventType === "medication_reminder") {
    candidateChannels = preferences.medication_reminders_channels;
  } else if (eventType === "appointment_reminder") {
    candidateChannels = preferences.appointment_reminders_channels;
  } else if (eventType === "assistance_request" || eventType === "emergency_alert") {
    candidateChannels = preferences.assistance_requests_channels;
  } else {
    candidateChannels = ["email"];
  }

  for (const channel of candidateChannels) {
    if (channel === "email" && preferences.email_enabled) {
      activeChannels.push("email");
    } else if (channel === "sms" && preferences.sms_enabled) {
      activeChannels.push("sms");
    } else if (channel === "push" && preferences.push_enabled) {
      activeChannels.push("push");
    }
  }

  return activeChannels;
}

/**
 * Validates preferences, recipient consent, and Care Circle authorization,
 * then constructs a privacy-masked, idempotency-protected outbox job for each permitted channel.
 *
 * IMPORTANT HEALTHCARE SAFETY RULE:
 * This function NEVER modifies or marks the associated in-app alert as acknowledged.
 * In-app alerts remain the authoritative log of patient healthcare status.
 */
export function createNotificationOutboxJobs(
  input: QueueNotificationJobInput
): QueueJobResult[] {
  const permittedChannels = getActiveChannelsForEvent(input.eventType, input.preferences);
  const results: QueueJobResult[] = [];

  if (permittedChannels.length === 0) {
    return [
      {
        queued: false,
        channel: "email",
        rejectedReason: "All notification channels for this event are disabled in patient preferences.",
      },
    ];
  }

  for (const channel of permittedChannels) {
    // 1. Authorize recipient & verify explicit consent
    const authResult = authorizeNotificationDispatch({
      isCaregiver: input.recipient.isCaregiver,
      caregiverId: input.recipient.caregiverId,
      patientId: input.patientId,
      destination: input.recipient.destination,
      channel,
      purpose: input.eventType,
      consents: input.consents,
      careCircleMembers: input.careCircleMembers,
    });

    if (!authResult.authorized) {
      results.push({
        queued: false,
        channel,
        rejectedReason: authResult.reason || "Recipient unauthorized or consent missing.",
      });
      continue;
    }

    // 2. Sanitize payload according to channel privacy standards
    const sanitized = sanitizeNotificationPayload(
      input.eventType,
      channel,
      input.patientName,
      input.rawDetails
    );

    // 3. Build collision-resistant idempotency key
    const idempotencyKey = buildNotificationIdempotencyKey({
      patientId: input.patientId,
      eventType: input.eventType,
      referenceId: input.referenceId,
      channel,
      scheduledTimeOrDate: input.scheduledTimeOrDate,
      recipientDestination: input.recipient.destination,
    });

    const job: Omit<DbNotificationOutbox, "id" | "created_at" | "updated_at"> = {
      patient_id: input.patientId,
      idempotency_key: idempotencyKey,
      event_type: input.eventType,
      channel,
      recipient_destination: input.recipient.destination,
      recipient_name: input.recipient.name,
      title: sanitized.title,
      body: sanitized.body,
      metadata: {
        isPrivacyMasked: sanitized.isPrivacyMasked,
        referenceId: input.referenceId,
        consentId: authResult.consentId,
        recipientId: input.recipient.caregiverId || null,
        isCaregiver: input.recipient.isCaregiver,
      },
      related_alert_id: input.relatedAlertId || null,
      status: "pending",
      retry_count: 0,
      max_retries: 3,
      next_retry_at: new Date().toISOString(),
      processed_at: null,
    };

    results.push({
      queued: true,
      channel,
      job,
    });
  }

  return results;
}

/**
 * Phase 8A Mock Provider implementation.
 * Validates the provider-neutral interface contract without calling live external services.
 */
export class MockNotificationProvider implements INotificationProvider {
  constructor(public name: string, public channel: NotificationChannel) {}

  async send(payload: NotificationPayload): Promise<NotificationProviderResult> {
    const startTime = Date.now();

    // Verify destination format
    if (!payload.to || !payload.to.trim()) {
      return {
        success: false,
        errorCode: "INVALID_DESTINATION",
        errorMessage: "Recipient destination address is blank.",
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      providerMessageId: `mock_${this.channel}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      latencyMs: Date.now() - startTime,
      raw: { status: "simulated_success", timestamp: new Date().toISOString() },
    };
  }
}

/**
 * Runtime guard evaluated immediately before a pending outbox job is dispatched.
 * Fails closed: If consent has been revoked since the job was queued, or if the
 * recipient caregiver is no longer an active Care Circle member, the dispatch is aborted
 * and the job transitions to 'cancelled'.
 */
export function canDispatchPendingOutboxJob(
  job: DbNotificationOutbox,
  currentConsents: DbNotificationConsent[],
  currentCareCircleMembers: DbCareCircleMember[]
): { canDispatch: boolean; reason?: string } {
  // Check if consent has been revoked or missing
  const consentCheck = checkRecipientConsent(
    currentConsents,
    job.recipient_destination,
    job.channel,
    job.event_type,
    job.patient_id
  );

  if (!consentCheck.hasConsent) {
    return {
      canDispatch: false,
      reason: `Dispatch aborted: ${consentCheck.reason || "Consent is no longer active."}`,
    };
  }

  // If destination is a caregiver (or recipientId is in metadata), check Care Circle status
  const recipientId = typeof job.metadata?.recipientId === "string" ? job.metadata.recipientId : undefined;
  if (recipientId) {
    const caregiverCheck = authorizeCaregiverRecipient(
      recipientId,
      currentCareCircleMembers,
      job.patient_id
    );
    if (!caregiverCheck.isAuthorized) {
      return {
        canDispatch: false,
        reason: `Dispatch aborted: ${caregiverCheck.reason || "Caregiver is no longer active."}`,
      };
    }
  }

  return { canDispatch: true };
}

/**
 * Simulates processing an outbox job against a provider, returning updated outbox state
 * and delivery attempt log.
 */
export function simulateProcessOutboxJob(
  job: DbNotificationOutbox,
  provider: INotificationProvider,
  providerResult: NotificationProviderResult
): {
  updatedJob: DbNotificationOutbox;
  deliveryLog: {
    outbox_id: string;
    patient_id: string;
    channel: NotificationChannel;
    provider: string;
    provider_message_id?: string | null;
    status: "sent" | "delivered" | "failed";
    error_code?: string | null;
    error_message?: string | null;
    latency_ms: number;
  };
} {
  const nowIso = new Date().toISOString();

  if (providerResult.success) {
    return {
      updatedJob: {
        ...job,
        status: "delivered",
        processed_at: nowIso,
        updated_at: nowIso,
      },
      deliveryLog: {
        outbox_id: job.id,
        patient_id: job.patient_id,
        channel: job.channel,
        provider: provider.name,
        provider_message_id: providerResult.providerMessageId || null,
        status: "sent",
        latency_ms: providerResult.latencyMs,
      },
    };
  }

  // Handle Failure & Evaluation
  const retryEval = evaluateNotificationRetry(
    job.retry_count,
    job.max_retries,
    providerResult.errorCode || providerResult.errorMessage
  );

  const updatedStatus = retryEval.shouldRetry ? "pending" : "failed";
  const nextRetryIso = retryEval.nextRetryAt
    ? retryEval.nextRetryAt.toISOString()
    : job.next_retry_at;

  return {
    updatedJob: {
      ...job,
      status: updatedStatus,
      retry_count: job.retry_count + 1,
      next_retry_at: nextRetryIso,
      processed_at: nowIso,
      updated_at: nowIso,
    },
    deliveryLog: {
      outbox_id: job.id,
      patient_id: job.patient_id,
      channel: job.channel,
      provider: provider.name,
      status: "failed",
      error_code: providerResult.errorCode || "SEND_FAILED",
      error_message: providerResult.errorMessage || retryEval.reason,
      latency_ms: providerResult.latencyMs,
    },
  };
}
