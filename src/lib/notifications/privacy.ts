// CareCircle Phase 8A: Notification Privacy & Payload Sanitization
// Enforces strict healthcare privacy standards: SMS, Web Push, and outbound Email
// must NEVER leak sensitive medical information (specific medication names, dosages, conditions).
// Full clinical details remain securely within the authenticated CareCircle app.

import { NotificationChannel, NotificationEventType } from "@/types/notifications";

export interface SanitizedNotificationContent {
  title: string;
  body: string;
  isPrivacyMasked: boolean;
}

/**
 * Strips specific medication dosages, brand names, and medical conditions from payloads.
 * By default, ALL outbound channels (SMS, Web Push, and Email) deliver generic,
 * privacy-preserving actionable prompts.
 *
 * Full clinical details (drug name, exact dosage, prescribing doctor, medical history)
 * require authenticating directly into the CareCircle companion app.
 */
export function sanitizeNotificationPayload(
  eventType: NotificationEventType,
  channel: NotificationChannel,
  patientName: string,
  rawDetails?: {
    medicationName?: string;
    dosage?: string;
    appointmentTitle?: string;
    doctorName?: string;
    assistanceReason?: string;
  }
): SanitizedNotificationContent {
  // SMS and Web Push: Strictly masked and compact for device lock screens
  if (channel === "sms" || channel === "push") {
    switch (eventType) {
      case "medication_reminder":
        return {
          title: "CareCircle Reminder",
          body: "Namaste, it is time for a scheduled medication dose. Open CareCircle to confirm your routine.",
          isPrivacyMasked: true,
        };
      case "appointment_reminder":
        return {
          title: "CareCircle Appointment Reminder",
          body: "You have an upcoming medical consultation scheduled today. Check CareCircle for clinic details.",
          isPrivacyMasked: true,
        };
      case "assistance_request":
        return {
          title: "CareCircle Assistance Alert",
          body: `Family check-in requested by ${patientName || "your family member"}${
            rawDetails?.assistanceReason ? `: "${rawDetails.assistanceReason}"` : ""
          }. Please open CareCircle or call directly.`,
          isPrivacyMasked: false,
        };
      case "emergency_alert":
        return {
          title: "CareCircle Priority Alert",
          body: `Urgent assistance requested by ${patientName}. Please contact them immediately.`,
          isPrivacyMasked: false,
        };
      case "schedule_update":
        return {
          title: "CareCircle Schedule Update",
          body: "A healthcare routine schedule has been updated. Open CareCircle to view the latest plan.",
          isPrivacyMasked: true,
        };
      default:
        return {
          title: "CareCircle Notification",
          body: "You have a new update in your CareCircle companion.",
          isPrivacyMasked: true,
        };
    }
  }

  // Email channel: Generic by default for healthcare privacy.
  // Emails pass through multiple SMTP hops and lock screen notifications.
  // Sensitive dosages and medication names are withheld until authenticated.
  switch (eventType) {
    case "medication_reminder":
      return {
        title: "CareCircle Medication Reminder",
        body: "Namaste, you have a scheduled routine medication dose. Please sign in to CareCircle to view your prescription and confirm your dose.",
        isPrivacyMasked: true,
      };
    case "appointment_reminder":
      return {
        title: "CareCircle Appointment Reminder",
        body: "You have an upcoming medical consultation scheduled today. Please sign in to CareCircle to view your consultation schedule and clinic details.",
        isPrivacyMasked: true,
      };
    case "assistance_request":
      return {
        title: `CareCircle Assistance Requested by ${patientName || "Family Member"}`,
        body: `${patientName || "Your family member"} has requested assistance${
          rawDetails?.assistanceReason ? `: "${rawDetails.assistanceReason}"` : "."
        } Please sign in to CareCircle or call them directly.`,
        isPrivacyMasked: false,
      };
    case "emergency_alert":
      return {
        title: `CareCircle Priority Alert: ${patientName}`,
        body: `Urgent assistance requested by ${patientName}. Please contact them immediately or open CareCircle.`,
        isPrivacyMasked: false,
      };
    default:
      return {
        title: "CareCircle Healthcare Update",
        body: "You have a new update in your CareCircle companion. Please sign in to view details.",
        isPrivacyMasked: true,
      };
  }
}

/**
 * Validates E.164 phone format (e.g. +919820145678).
 */
export function isValidE164Phone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.trim();
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  return e164Regex.test(cleaned);
}

/**
 * Clean & normalize phone numbers to E.164 where possible.
 * Assumes +91 for standard 10-digit Indian numbers without country code.
 */
export function normalizePhone(rawPhone: string): string | null {
  if (!rawPhone || typeof rawPhone !== "string") return null;
  const digits = rawPhone.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return isValidE164Phone(digits) ? digits : null;
  }

  // If 10 digits without prefix, default to Indian country code +91
  if (digits.length === 10) {
    const withPrefix = `+91${digits}`;
    return isValidE164Phone(withPrefix) ? withPrefix : null;
  }

  return null;
}
