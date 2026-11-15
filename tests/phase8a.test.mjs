import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// -------------------------------------------------------------
// Pure JavaScript mirrors of Notification Infrastructure Modules
// -------------------------------------------------------------

function sanitizeNotificationPayload(eventType, channel, patientName, rawDetails) {
  if (channel === "sms" || channel === "push") {
    switch (eventType) {
      case "medication_reminder":
        return {
          title: "CareCircle Reminder",
          body: `Namaste, it is time for a scheduled medication dose. Open CareCircle to confirm your routine.`,
          isPrivacyMasked: true,
        };
      case "appointment_reminder":
        return {
          title: "CareCircle Appointment Reminder",
          body: `You have an upcoming medical consultation scheduled today. Check CareCircle for clinic details.`,
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
          body: `A healthcare routine schedule has been updated. Open CareCircle to view the latest plan.`,
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

  // Email channel: Generic by default for healthcare privacy
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

function isValidE164Phone(phone) {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.trim();
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  return e164Regex.test(cleaned);
}

function normalizePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") return null;
  const digits = rawPhone.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return isValidE164Phone(digits) ? digits : null;
  }

  if (digits.length === 10) {
    const withPrefix = `+91${digits}`;
    return isValidE164Phone(withPrefix) ? withPrefix : null;
  }

  return null;
}

function checkRecipientConsent(consents, destination, channel, purpose, expectedPatientId) {
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

function authorizeCaregiverRecipient(caregiverId, careCircleMembers, expectedPatientId) {
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

function authorizeNotificationDispatch(params) {
  if (params.isCaregiver) {
    if (!params.caregiverId) {
      return {
        authorized: false,
        reason: "Caregiver recipient requires a valid Care Circle member ID.",
      };
    }

    const caregiverCheck = authorizeCaregiverRecipient(
      params.caregiverId,
      params.careCircleMembers,
      params.patientId
    );

    if (!caregiverCheck.isAuthorized) {
      return { authorized: false, reason: caregiverCheck.reason };
    }
  }

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

function canDispatchPendingOutboxJob(job, currentConsents, currentCareCircleMembers) {
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

  const recipientId = job.recipient_id || job.metadata?.recipientId;
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

function buildNotificationIdempotencyKey(params) {
  const cleanPatient = params.patientId.trim().toLowerCase();
  const cleanEvent = params.eventType.trim().toLowerCase();
  const cleanRef = params.referenceId.trim().toLowerCase();
  const cleanChannel = params.channel.trim().toLowerCase();
  const cleanDest = params.recipientDestination.trim().toLowerCase();

  let timeKey = params.scheduledTimeOrDate.trim();
  if (timeKey.includes("T")) {
    timeKey = timeKey.slice(0, 16);
  }

  return `notif_${cleanPatient}_${cleanEvent}_${cleanRef}_${cleanChannel}_${cleanDest}_${timeKey}`;
}

function isDuplicateNotification(candidateKey, existingKeys) {
  if (existingKeys instanceof Set) {
    return existingKeys.has(candidateKey);
  }
  return existingKeys.includes(candidateKey);
}

const PERMANENT_ERROR_PATTERNS = [
  /invalid[_\s]recipient/i,
  /invalid[_\s]phone/i,
  /invalid[_\s]email/i,
  /unsubscribed/i,
  /blacklisted/i,
  /consent[_\s]revoked/i,
  /not[_\s]found/i,
  /unauthorized/i,
  /forbidden/i,
];

function evaluateNotificationRetry(
  currentRetryCount,
  maxRetries = 3,
  errorCodeOrMessage,
  baseDelaySec = 60,
  maxDelaySec = 3600
) {
  const errorText = errorCodeOrMessage || "";

  const isPermanent = PERMANENT_ERROR_PATTERNS.some((pattern) =>
    pattern.test(errorText)
  );

  if (isPermanent) {
    return {
      shouldRetry: false,
      isTerminal: true,
      reason: `Permanent delivery error detected: "${errorText}". Job will not be retried.`,
    };
  }

  if (currentRetryCount >= maxRetries) {
    return {
      shouldRetry: false,
      isTerminal: true,
      reason: `Exceeded maximum retry limit (${maxRetries}). Terminating job.`,
    };
  }

  const delaySec = Math.min(
    baseDelaySec * Math.pow(2, currentRetryCount),
    maxDelaySec
  );
  const nextRetry = new Date(Date.now() + delaySec * 1000);

  return {
    shouldRetry: true,
    isTerminal: false,
    nextRetryAt: nextRetry,
    reason: `Transient error. Retrying in ${delaySec}s (attempt ${
      currentRetryCount + 1
    } of ${maxRetries}).`,
  };
}

function getActiveChannelsForEvent(eventType, preferences) {
  const activeChannels = [];
  let candidateChannels = [];
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

function createNotificationOutboxJobs(input) {
  const permittedChannels = getActiveChannelsForEvent(input.eventType, input.preferences);
  const results = [];

  for (const channel of permittedChannels) {
    const purpose = input.eventType;
    const authCheck = authorizeNotificationDispatch({
      isCaregiver: input.recipient.isCaregiver,
      caregiverId: input.recipient.caregiverId,
      patientId: input.patientId,
      destination: input.recipient.destination,
      channel,
      purpose,
      consents: input.consents,
      careCircleMembers: input.careCircleMembers,
    });

    if (!authCheck.authorized) {
      results.push({
        queued: false,
        channel,
        rejectedReason: authCheck.reason,
      });
      continue;
    }

    const sanitized = sanitizeNotificationPayload(
      input.eventType,
      channel,
      input.patientName,
      input.rawDetails
    );

    const idempotencyKey = buildNotificationIdempotencyKey({
      patientId: input.patientId,
      eventType: input.eventType,
      referenceId: input.referenceId,
      channel,
      scheduledTimeOrDate: input.scheduledTimeOrDate,
      recipientDestination: input.recipient.destination,
    });

    const job = {
      patient_id: input.patientId,
      recipient_type: input.recipient.isCaregiver ? "caregiver" : "patient",
      recipient_id: input.recipient.caregiverId || null,
      channel,
      event_type: input.eventType,
      related_alert_id: input.relatedAlertId || null,
      idempotency_key: idempotencyKey,
      recipient_destination: input.recipient.destination,
      recipient_name: input.recipient.name,
      title: sanitized.title,
      body: sanitized.body,
      metadata: {
        isPrivacyMasked: sanitized.isPrivacyMasked,
        referenceId: input.referenceId,
      },
      status: "pending",
      retry_count: 0,
      max_retries: 3,
      next_retry_at: new Date().toISOString(),
      sent_at: null,
      failed_at: null,
      error_message: null,
    };

    results.push({
      queued: true,
      channel,
      job,
    });
  }

  return results;
}

class MockNotificationProvider {
  constructor(providerName, channel) {
    this.providerName = providerName;
    this.channel = channel;
  }

  async send() {
    return {
      success: true,
      providerMessageId: `mock_${this.channel}_${Date.now()}`,
      latencyMs: 15,
    };
  }
}

function simulateProcessOutboxJob(job, provider, mockResult) {
  const result = mockResult || {
    success: true,
    providerMessageId: `mock_${job.channel}_123`,
    latencyMs: 10,
  };

  if (result.success) {
    const updatedJob = {
      ...job,
      status: "delivered",
      sent_at: new Date().toISOString(),
      error_message: null,
    };

    const deliveryLog = {
      outbox_id: job.id,
      patient_id: job.patient_id,
      channel: job.channel,
      destination: job.recipient_destination,
      status: "sent",
      provider_name: provider.providerName,
      provider_message_id: result.providerMessageId || null,
      error_code: null,
      error_message: null,
      latency_ms: result.latencyMs,
    };

    return { updatedJob, deliveryLog };
  } else {
    const retryEval = evaluateNotificationRetry(
      job.retry_count,
      job.max_retries,
      result.errorMessage
    );

    const updatedJob = {
      ...job,
      retry_count: job.retry_count + 1,
      status: retryEval.isTerminal ? "failed" : "pending",
      next_retry_at: retryEval.nextRetryAt ? retryEval.nextRetryAt.toISOString() : null,
      failed_at: retryEval.isTerminal ? new Date().toISOString() : null,
      error_message: result.errorMessage || "Delivery error",
    };

    const deliveryLog = {
      outbox_id: job.id,
      patient_id: job.patient_id,
      channel: job.channel,
      destination: job.recipient_destination,
      status: "failed",
      provider_name: provider.providerName,
      provider_message_id: null,
      error_code: result.errorCode || "PROVIDER_ERROR",
      error_message: result.errorMessage || "Unknown error",
      latency_ms: result.latencyMs,
    };

    return { updatedJob, deliveryLog };
  }
}

describe("Phase 8A: Healthcare Privacy & Payload Sanitization", () => {
  test("SMS payload NEVER leaks sensitive medication names or dosages", () => {
    const sanitized = sanitizeNotificationPayload(
      "medication_reminder",
      "sms",
      "Eleanor Vance",
      {
        medicationName: "Metformin Glycomet",
        dosage: "500 mg",
      }
    );

    assert.equal(sanitized.isPrivacyMasked, true);
    assert.doesNotMatch(sanitized.body, /metformin/i);
    assert.doesNotMatch(sanitized.body, /glycomet/i);
    assert.doesNotMatch(sanitized.body, /500\s*mg/i);
    assert.match(sanitized.body, /CareCircle/i);
  });

  test("Web Push payload NEVER leaks clinical dosages or medication names", () => {
    const sanitized = sanitizeNotificationPayload(
      "medication_reminder",
      "push",
      "Eleanor Vance",
      {
        medicationName: "Telmisartan",
        dosage: "40 mg",
      }
    );

    assert.equal(sanitized.isPrivacyMasked, true);
    assert.doesNotMatch(sanitized.body, /telmisartan/i);
    assert.doesNotMatch(sanitized.body, /40\s*mg/i);
    assert.match(sanitized.body, /scheduled medication dose/i);
  });

  test("Email payload defaults to generic privacy-masked reminder requiring CareCircle login", () => {
    const content = sanitizeNotificationPayload(
      "medication_reminder",
      "email",
      "Eleanor Vance",
      {
        medicationName: "Atorvastatin",
        dosage: "10 mg",
      }
    );

    assert.equal(content.isPrivacyMasked, true);
    assert.doesNotMatch(content.title, /Atorvastatin/i);
    assert.doesNotMatch(content.body, /10\s*mg/i);
    assert.match(content.body, /sign in to CareCircle/i);
  });

  test("validates and normalizes Indian E.164 phone formats", () => {
    assert.equal(isValidE164Phone("+919820145678"), true);
    assert.equal(isValidE164Phone("9820145678"), false);
    assert.equal(isValidE164Phone("invalid-phone"), false);

    // Auto-normalize 10 digit Indian number with +91 country prefix
    assert.equal(normalizePhone("9820145678"), "+919820145678");
    assert.equal(normalizePhone("+91 98201 45678"), "+919820145678");
    assert.equal(normalizePhone("123"), null);
  });
});

describe("Phase 8A: Recipient Consent & Authorization Guard", () => {
  const activeConsents = [
    {
      id: "consent-01",
      patient_id: "patient-123",
      recipient_type: "patient",
      recipient_id: null,
      channel: "email",
      purpose: "medication_reminder",
      destination: "eleanor@example.com",
      status: "granted",
      granted_at: "2026-11-15T10:00:00Z",
      revoked_at: null,
    },
    {
      id: "consent-02",
      patient_id: "patient-123",
      recipient_type: "caregiver",
      recipient_id: "cg-01",
      channel: "sms",
      purpose: "assistance_request",
      destination: "+919820145678",
      status: "granted",
      granted_at: "2026-11-15T10:00:00Z",
      revoked_at: null,
    },
    {
      id: "consent-03",
      patient_id: "patient-123",
      recipient_type: "caregiver",
      recipient_id: "cg-02",
      channel: "sms",
      purpose: "medication_reminder",
      destination: "+919820256789",
      status: "revoked",
      granted_at: "2026-11-01T10:00:00Z",
      revoked_at: "2026-11-10T12:00:00Z",
    },
  ];

  const careCircleMembers = [
    {
      id: "cg-01",
      patient_id: "patient-123",
      member_name: "Michael Vance",
      relationship: "Son",
      phone_number: "+919820145678",
      email: "michael@example.com",
      role: "caregiver",
      status: "active",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
    {
      id: "cg-revoked",
      patient_id: "patient-123",
      member_name: "Former Aide",
      relationship: "Aide",
      phone_number: "+919820367890",
      email: "aide@example.com",
      role: "caregiver",
      status: "revoked",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
  ];

  test("allows dispatch when recipient has active granted consent", () => {
    const result = checkRecipientConsent(
      activeConsents,
      "eleanor@example.com",
      "email",
      "medication_reminder"
    );
    assert.equal(result.hasConsent, true);
    assert.equal(result.consentRecord?.id, "consent-01");
  });

  test("blocks dispatch when recipient consent has been revoked", () => {
    const result = checkRecipientConsent(
      activeConsents,
      "+919820256789",
      "sms",
      "medication_reminder"
    );
    assert.equal(result.hasConsent, false);
    assert.match(result.reason, /revoked/i);
  });

  test("blocks dispatch when no consent record exists on file", () => {
    const result = checkRecipientConsent(
      activeConsents,
      "stranger@example.com",
      "email",
      "medication_reminder"
    );
    assert.equal(result.hasConsent, false);
    assert.match(result.reason, /no consent/i);
  });

  test("authorizes active Care Circle members and blocks revoked contacts", () => {
    const authActive = authorizeCaregiverRecipient("cg-01", careCircleMembers);
    assert.equal(authActive.isAuthorized, true);
    assert.equal(authActive.caregiver?.member_name, "Michael Vance");

    const authRevoked = authorizeCaregiverRecipient("cg-revoked", careCircleMembers);
    assert.equal(authRevoked.isAuthorized, false);
    assert.match(authRevoked.reason, /revoked/i);

    const authUnknown = authorizeCaregiverRecipient("unknown-id", careCircleMembers);
    assert.equal(authUnknown.isAuthorized, false);
    assert.match(authUnknown.reason, /not an authorized member/i);
  });

  test("full dispatch check prevents sending alerts to unverified caregivers", () => {
    const check = authorizeNotificationDispatch({
      isCaregiver: true,
      caregiverId: "cg-revoked",
      destination: "+919820367890",
      channel: "sms",
      purpose: "assistance_request",
      consents: activeConsents,
      careCircleMembers,
    });

    assert.equal(check.authorized, false);
  });

  test("fails closed when consent list is empty or undefined", () => {
    const checkEmpty = checkRecipientConsent([], "eleanor@example.com", "email", "medication_reminder");
    assert.equal(checkEmpty.hasConsent, false);
    assert.match(checkEmpty.reason, /fails closed/i);

    const checkNull = checkRecipientConsent(null, "eleanor@example.com", "email", "medication_reminder");
    assert.equal(checkNull.hasConsent, false);
  });

  test("strictly prevents cross-patient caregiver authorization", () => {
    // Caregiver belongs to patient-123; check under patient-999
    const crossCheck = authorizeCaregiverRecipient("cg-01", careCircleMembers, "patient-999");
    assert.equal(crossCheck.isAuthorized, false);
    assert.match(crossCheck.reason, /does not belong to this patient/i);
  });

  test("runtime guard canDispatchPendingOutboxJob aborts if consent is revoked before dispatch", () => {
    const pendingJob = {
      id: "job-p1",
      patient_id: "patient-123",
      recipient_id: null,
      channel: "sms",
      event_type: "medication_reminder",
      recipient_destination: "+919820256789",
    };

    const dispatchCheck = canDispatchPendingOutboxJob(pendingJob, activeConsents, careCircleMembers);
    assert.equal(dispatchCheck.canDispatch, false);
    assert.match(dispatchCheck.reason, /revoked/i);
  });

  test("runtime guard canDispatchPendingOutboxJob aborts if caregiver was deactivated", () => {
    const pendingJob = {
      id: "job-p2",
      patient_id: "patient-123",
      recipient_id: "cg-revoked",
      channel: "sms",
      event_type: "assistance_request",
      recipient_destination: "+919820145678",
    };

    const dispatchCheck = canDispatchPendingOutboxJob(pendingJob, activeConsents, careCircleMembers);
    assert.equal(dispatchCheck.canDispatch, false);
    assert.match(dispatchCheck.reason, /revoked/i);
  });
});

describe("Phase 8A: Idempotency & Duplicate Prevention", () => {
  test("generates deterministic collision-resistant idempotency keys", () => {
    const key1 = buildNotificationIdempotencyKey({
      patientId: "usr-1",
      eventType: "medication_reminder",
      referenceId: "med-amlodipine",
      channel: "email",
      scheduledTimeOrDate: "2026-11-15T08:00:00Z",
      recipientDestination: "patient@example.com",
    });

    const key2 = buildNotificationIdempotencyKey({
      patientId: "usr-1",
      eventType: "medication_reminder",
      referenceId: "med-amlodipine",
      channel: "email",
      scheduledTimeOrDate: "2026-11-15T08:00:00Z",
      recipientDestination: "patient@example.com",
    });

    assert.equal(key1, key2);
    assert.ok(key1.startsWith("notif_usr-1_medication_reminder_med-amlodipine_email_"));
  });

  test("generates distinct keys for different channels for the same event", () => {
    const emailKey = buildNotificationIdempotencyKey({
      patientId: "usr-1",
      eventType: "medication_reminder",
      referenceId: "med-1",
      channel: "email",
      scheduledTimeOrDate: "2026-11-15T08:00:00Z",
      recipientDestination: "test@example.com",
    });

    const smsKey = buildNotificationIdempotencyKey({
      patientId: "usr-1",
      eventType: "medication_reminder",
      referenceId: "med-1",
      channel: "sms",
      scheduledTimeOrDate: "2026-11-15T08:00:00Z",
      recipientDestination: "+919820145678",
    });

    assert.notEqual(emailKey, smsKey);
  });

  test("identifies duplicate jobs in set of existing idempotency keys", () => {
    const existing = new Set(["key_a", "key_b"]);
    assert.equal(isDuplicateNotification("key_a", existing), true);
    assert.equal(isDuplicateNotification("key_c", existing), false);
  });
});

describe("Phase 8A: Retry Policy & Terminal Failure Classification", () => {
  test("transient errors back off exponentially up to max limit", () => {
    const retry1 = evaluateNotificationRetry(0, 3, "HTTP 429 Rate Limit Exceeded");
    assert.equal(retry1.shouldRetry, true);
    assert.equal(retry1.isTerminal, false);
    assert.ok(retry1.nextRetryAt instanceof Date);

    const retry2 = evaluateNotificationRetry(1, 3, "503 Service Unavailable");
    assert.equal(retry2.shouldRetry, true);

    const retryExceeded = evaluateNotificationRetry(3, 3, "Network timeout");
    assert.equal(retryExceeded.shouldRetry, false);
    assert.equal(retryExceeded.isTerminal, true);
    assert.match(retryExceeded.reason, /exceeded maximum retry limit/i);
  });

  test("permanent provider failures terminate immediately without retry", () => {
    const invalidPhone = evaluateNotificationRetry(0, 3, "Invalid_phone_number");
    assert.equal(invalidPhone.shouldRetry, false);
    assert.equal(invalidPhone.isTerminal, true);

    const unsubscribed = evaluateNotificationRetry(0, 3, "Recipient unsubscribed");
    assert.equal(unsubscribed.shouldRetry, false);
    assert.equal(unsubscribed.isTerminal, true);

    const revoked = evaluateNotificationRetry(0, 3, "Consent_revoked_by_user");
    assert.equal(revoked.shouldRetry, false);
    assert.equal(revoked.isTerminal, true);
  });
});

describe("Phase 8A: Outbox Queue & In-App Alert Decoupling", () => {
  const preferences = {
    id: "pref-01",
    patient_id: "p-1",
    email_enabled: true,
    sms_enabled: true,
    push_enabled: false,
    medication_reminders_channels: ["email"],
    appointment_reminders_channels: ["email", "sms"],
    assistance_requests_channels: ["email", "sms"],
    quiet_hours_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
  };

  const consents = [
    {
      id: "c-01",
      patient_id: "p-1",
      recipient_type: "patient",
      recipient_id: null,
      channel: "email",
      purpose: "medication_reminder",
      destination: "eleanor@example.com",
      status: "granted",
      granted_at: "2026-11-15T00:00:00Z",
      revoked_at: null,
    },
  ];

  test("evaluates active channels matching preferences and global switches", () => {
    const medChannels = getActiveChannelsForEvent("medication_reminder", preferences);
    assert.deepEqual(medChannels, ["email"]);

    const aptChannels = getActiveChannelsForEvent("appointment_reminder", preferences);
    assert.deepEqual(aptChannels, ["email", "sms"]);
  });

  test("queues outbox jobs and NEVER marks in-app alerts as acknowledged", () => {
    const alertRecord = {
      id: "alert-101",
      patient_id: "p-1",
      type: "medication",
      status: "pending",
      acknowledged_at: null,
    };

    const results = createNotificationOutboxJobs({
      patientId: "p-1",
      patientName: "Eleanor Vance",
      eventType: "medication_reminder",
      referenceId: "med-1",
      scheduledTimeOrDate: "2026-11-15T08:00:00Z",
      relatedAlertId: alertRecord.id,
      rawDetails: { medicationName: "Metformin", dosage: "500 mg" },
      recipient: {
        name: "Eleanor Vance",
        destination: "eleanor@example.com",
        isCaregiver: false,
      },
      preferences,
      consents,
      careCircleMembers: [],
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].queued, true);
    assert.equal(results[0].job?.status, "pending");
    assert.equal(results[0].job?.related_alert_id, "alert-101");

    // CRITICAL HEALTHCARE SAFETY ASSERTION: In-app alert status is completely decoupled
    assert.equal(alertRecord.status, "pending");
    assert.equal(alertRecord.acknowledged_at, null);
  });

  test("Mock Provider validates provider-neutral interface contract", async () => {
    const provider = new MockNotificationProvider("resend-mock", "email");
    const result = await provider.send({
      to: "patient@example.com",
      recipientName: "Eleanor Vance",
      subject: "Test Reminder",
      bodyText: "This is a test notification.",
    });

    assert.equal(result.success, true);
    assert.ok(result.providerMessageId?.startsWith("mock_email_"));
    assert.ok(result.latencyMs >= 0);
  });

  test("simulated outbox runner updates job to delivered and logs delivery", () => {
    const dummyJob = {
      id: "job-01",
      patient_id: "p-1",
      idempotency_key: "key-01",
      event_type: "medication_reminder",
      channel: "email",
      recipient_destination: "patient@example.com",
      recipient_name: "Eleanor",
      title: "Med Reminder",
      body: "Time for meds",
      metadata: {},
      status: "pending",
      retry_count: 0,
      max_retries: 3,
      next_retry_at: new Date().toISOString(),
    };

    const provider = new MockNotificationProvider("mock-email", "email");
    const simSuccess = simulateProcessOutboxJob(dummyJob, provider, {
      success: true,
      providerMessageId: "prov-123",
      latencyMs: 42,
    });

    assert.equal(simSuccess.updatedJob.status, "delivered");
    assert.equal(simSuccess.deliveryLog.status, "sent");
    assert.equal(simSuccess.deliveryLog.provider_message_id, "prov-123");
    assert.equal(simSuccess.deliveryLog.latency_ms, 42);
  });
});

describe("Phase 8A: Database Schema & RLS Verification", () => {
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  const phase8aFile = files.find((f) => f.includes("create_notification_infrastructure"));

  test("notification infrastructure migration file exists", () => {
    assert.ok(phase8aFile, "Migration file for notification infrastructure must exist");
  });

  test("enables Row Level Security on all 5 notification tables", () => {
    const sql = fs.readFileSync(path.join(migrationsDir, phase8aFile), "utf8");
    assert.match(sql, /ALTER TABLE public\.notification_preferences ENABLE ROW LEVEL SECURITY/i);
    assert.match(sql, /ALTER TABLE public\.notification_consents ENABLE ROW LEVEL SECURITY/i);
    assert.match(sql, /ALTER TABLE public\.notification_subscriptions ENABLE ROW LEVEL SECURITY/i);
    assert.match(sql, /ALTER TABLE public\.notification_outbox ENABLE ROW LEVEL SECURITY/i);
    assert.match(sql, /ALTER TABLE public\.notification_deliveries ENABLE ROW LEVEL SECURITY/i);
  });

  test("enforces foreign key cascading to public.profiles", () => {
    const sql = fs.readFileSync(path.join(migrationsDir, phase8aFile), "utf8");
    assert.match(sql, /REFERENCES public\.profiles\(id\) ON DELETE CASCADE/i);
  });

  test("enforces idempotency unique constraint on notification_outbox", () => {
    const sql = fs.readFileSync(path.join(migrationsDir, phase8aFile), "utf8");
    assert.match(sql, /idempotency_key TEXT NOT NULL UNIQUE/i);
  });

  test("enforces unique consent constraint (patient_id, destination, channel, purpose)", () => {
    const sql = fs.readFileSync(path.join(migrationsDir, phase8aFile), "utf8");
    assert.match(sql, /CONSTRAINT uq_notification_consent UNIQUE/i);
  });

  test("defines atomic job claiming stored function with FOR UPDATE SKIP LOCKED", () => {
    const sql = fs.readFileSync(path.join(migrationsDir, phase8aFile), "utf8");
    assert.match(sql, /FUNCTION public\.claim_next_notification_jobs/i);
    assert.match(sql, /FOR UPDATE SKIP LOCKED/i);
    assert.match(sql, /SECURITY DEFINER/i);
    assert.match(sql, /SET search_path = public/i);
  });

  test("validates and clamps batch size between 1 and 100", () => {
    const sql = fs.readFileSync(path.join(migrationsDir, phase8aFile), "utf8");
    assert.match(sql, /GREATEST\(1,\s*LEAST\(COALESCE\(p_batch_size,\s*10\),\s*100\)\)/i);
  });

  test("revokes execution from PUBLIC, anon, and authenticated and grants only to service_role", () => {
    const sql = fs.readFileSync(path.join(migrationsDir, phase8aFile), "utf8");
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.claim_next_notification_jobs\(INT\) FROM PUBLIC/i);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.claim_next_notification_jobs\(INT\) FROM anon,\s*authenticated/i);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.claim_next_notification_jobs\(INT\) TO service_role/i);
  });

  test("defines performance indexes on outbox and consent lookup", () => {
    const sql = fs.readFileSync(path.join(migrationsDir, phase8aFile), "utf8");
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_notification_outbox_process/i);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_notification_consents_lookup/i);
  });
});

describe("Phase 8A: Source Code & Module Integrity Verification", () => {
  const tsModules = [
    { file: "src/types/notifications.ts", symbols: ["DbNotificationPreferences", "DbNotificationOutbox"] },
    { file: "src/lib/notifications/privacy.ts", symbols: ["sanitizeNotificationPayload", "isValidE164Phone"] },
    { file: "src/lib/notifications/consent.ts", symbols: ["checkRecipientConsent", "authorizeNotificationDispatch"] },
    { file: "src/lib/notifications/idempotency.ts", symbols: ["buildNotificationIdempotencyKey", "isDuplicateNotification"] },
    { file: "src/lib/notifications/retry.ts", symbols: ["evaluateNotificationRetry"] },
    { file: "src/lib/notifications/outbox.ts", symbols: ["createNotificationOutboxJobs", "canDispatchPendingOutboxJob"] },
    { file: "src/lib/notifications/index.ts", symbols: ["export * from \"./privacy\"", "export * from \"./outbox\""] },
  ];

  for (const m of tsModules) {
    test(`module ${m.file} exists and exports expected symbols`, () => {
      const fullPath = path.resolve(process.cwd(), m.file);
      assert.ok(fs.existsSync(fullPath), `File ${m.file} must exist`);
      const content = fs.readFileSync(fullPath, "utf8");
      for (const sym of m.symbols) {
        assert.ok(content.includes(sym), `${m.file} must export or define ${sym}`);
      }
    });
  }
});
