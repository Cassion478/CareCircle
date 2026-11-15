// CareCircle Phase 8A: Idempotency & Deduplication Engine
// Generates collision-resistant, deterministic keys for every scheduled
// notification job to guarantee at-most-once delivery per channel.

import { NotificationChannel, NotificationEventType } from "@/types/notifications";

/**
 * Builds a deterministic idempotency key for an outbox notification.
 * If the job scheduler or cron runs multiple times within the same interval,
 * the unique database index on `idempotency_key` rejects duplicate submissions.
 */
export function buildNotificationIdempotencyKey(params: {
  patientId: string;
  eventType: NotificationEventType;
  referenceId: string; // medication_id, appointment_id, or alert_id
  channel: NotificationChannel;
  scheduledTimeOrDate: string; // ISO timestamp or date
  recipientDestination: string;
}): string {
  const cleanPatient = params.patientId.trim().toLowerCase();
  const cleanEvent = params.eventType.trim().toLowerCase();
  const cleanRef = params.referenceId.trim().toLowerCase();
  const cleanChannel = params.channel.trim().toLowerCase();
  const cleanDest = params.recipientDestination.trim().toLowerCase();

  // Normalize scheduled timestamp to minute resolution to handle minor clock jitter
  let timeKey = params.scheduledTimeOrDate.trim();
  if (timeKey.includes("T")) {
    timeKey = timeKey.slice(0, 16); // YYYY-MM-DDTHH:MM
  }

  return `notif_${cleanPatient}_${cleanEvent}_${cleanRef}_${cleanChannel}_${cleanDest}_${timeKey}`;
}

/**
 * Checks whether an outbox job is a duplicate based on existing outbox keys.
 */
export function isDuplicateNotification(
  candidateKey: string,
  existingKeys: string[] | Set<string>
): boolean {
  if (existingKeys instanceof Set) {
    return existingKeys.has(candidateKey);
  }
  return existingKeys.includes(candidateKey);
}
