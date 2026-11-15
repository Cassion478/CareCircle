// CareCircle Phase 8A: Recipient Consent & Authorization Guard
// Enforces that notifications are NEVER sent without explicit, auditable,
// active consent from the intended recipient and that caregiver recipients are authorized.

import {
  DbNotificationConsent,
  NotificationChannel,
  NotificationPurpose,
} from "@/types/notifications";
import { DbCareCircleMember } from "@/types";

export interface RecipientAuthorizationResult {
  authorized: boolean;
  reason?: string;
  consentId?: string;
}

/**
 * Checks if a specific recipient has active, non-revoked consent
 * for receiving notifications through the requested channel and purpose.
 * Fails closed: If consent records cannot be verified or are missing,
 * notification dispatch is immediately rejected.
 */
export function checkRecipientConsent(
  consents: DbNotificationConsent[],
  destination: string,
  channel: NotificationChannel,
  purpose: NotificationPurpose,
  expectedPatientId?: string
): { hasConsent: boolean; consentRecord?: DbNotificationConsent; reason?: string } {
  if (!consents || !Array.isArray(consents) || consents.length === 0) {
    return {
      hasConsent: false,
      reason: "No consent records available. Notification dispatch fails closed.",
    };
  }

  if (!destination || !destination.trim()) {
    return { hasConsent: false, reason: "Recipient destination is missing or empty." };
  }

  const normalizedDest = destination.trim().toLowerCase();

  const matchingConsent = consents.find((c) => {
    const patientMatch = expectedPatientId ? c.patient_id === expectedPatientId : true;
    const destMatch = c.destination.trim().toLowerCase() === normalizedDest;
    const channelMatch = c.channel === channel;
    const purposeMatch = c.purpose === purpose;
    return patientMatch && destMatch && channelMatch && purposeMatch;
  });

  if (!matchingConsent) {
    return {
      hasConsent: false,
      reason: `No consent on file for destination ${destination} on channel '${channel}' for purpose '${purpose}'.`,
    };
  }

  if (matchingConsent.status !== "granted" || matchingConsent.revoked_at) {
    return {
      hasConsent: false,
      reason: `Consent has been revoked on ${matchingConsent.revoked_at || "prior date"}.`,
    };
  }

  return { hasConsent: true, consentRecord: matchingConsent };
}

/**
 * Validates that a caregiver recipient is an authorized member of the patient's Care Circle.
 * Revoked or pending members are blocked from receiving patient notifications.
 * Cross-patient membership mismatch is strictly forbidden.
 */
export function authorizeCaregiverRecipient(
  caregiverId: string,
  careCircleMembers: DbCareCircleMember[],
  expectedPatientId?: string
): { isAuthorized: boolean; caregiver?: DbCareCircleMember; reason?: string } {
  if (!caregiverId) {
    return { isAuthorized: false, reason: "Caregiver ID is missing." };
  }

  const member = careCircleMembers.find((m) => m.id === caregiverId);

  if (!member) {
    return {
      isAuthorized: false,
      reason: "Recipient is not an authorized member of this patient's Care Circle.",
    };
  }

  if (expectedPatientId && member.patient_id !== expectedPatientId) {
    return {
      isAuthorized: false,
      reason: "Caregiver recipient does not belong to this patient's Care Circle.",
    };
  }

  if (member.status !== "active") {
    return {
      isAuthorized: false,
      reason: `Care Circle membership status is '${member.status}'. Only 'active' contacts can receive alerts.`,
    };
  }

  return { isAuthorized: true, caregiver: member };
}

/**
 * Full authorization check combining Care Circle membership validation (if caregiver)
 * and explicit recipient channel consent.
 */
export function authorizeNotificationDispatch(params: {
  isCaregiver: boolean;
  caregiverId?: string | null;
  patientId?: string;
  destination: string;
  channel: NotificationChannel;
  purpose: NotificationPurpose;
  consents: DbNotificationConsent[];
  careCircleMembers: DbCareCircleMember[];
}): RecipientAuthorizationResult {
  // 1. If recipient is a caregiver, verify they are an active authorized Care Circle member
  if (params.isCaregiver) {
    if (!params.caregiverId) {
      return {
        authorized: false,
        reason: "Caregiver recipient requires a valid Care Circle member ID.",
      };
    }

    const memberCheck = authorizeCaregiverRecipient(
      params.caregiverId,
      params.careCircleMembers,
      params.patientId
    );
    if (!memberCheck.isAuthorized) {
      return { authorized: false, reason: memberCheck.reason };
    }
  }

  // 2. Verify explicit, active consent for destination, channel, and purpose
  const consentCheck = checkRecipientConsent(
    params.consents,
    params.destination,
    params.channel,
    params.purpose,
    params.patientId
  );

  if (!consentCheck.hasConsent) {
    return { authorized: false, reason: consentCheck.reason };
  }

  return {
    authorized: true,
    consentId: consentCheck.consentRecord?.id,
  };
}
