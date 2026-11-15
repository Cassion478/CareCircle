import {
  DbAlert,
  DbAlertPreferences,
  DbMedication,
  DbMedicationDoseLog,
  DbAppointment,
  AlertStatus,
} from "@/types";

/**
 * Checks if an alert is currently active and requires attention.
 * Active if:
 * - status === 'pending'
 * - status === 'snoozed' AND snoozed_until has passed
 */
export function isAlertActive(alert: DbAlert, now = new Date()): boolean {
  if (alert.status === "pending") return true;
  if (alert.status === "snoozed" && alert.snoozed_until) {
    return new Date(alert.snoozed_until) <= now;
  }
  return false;
}

/**
 * Formats ISO timestamp to elderly-friendly readable time
 */
export function formatAlertTime(dateIso: string): string {
  try {
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return dateIso;
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateIso;
  }
}

/**
 * Deterministically generates medication reminder alerts for a patient based on active meds and dose logs.
 * Avoids generating alerts for doses already marked taken.
 */
export function generateMedicationAlertCandidates(
  medications: DbMedication[],
  doseLogs: DbMedicationDoseLog[],
  patientId: string,
  targetDate = new Date()
): Omit<DbAlert, "id" | "created_at" | "updated_at">[] {
  const targetDateStr = targetDate.toISOString().split("T")[0];
  const candidates: Omit<DbAlert, "id" | "created_at" | "updated_at">[] = [];

  for (const med of medications) {
    if (!med.is_active) continue;
    if (med.start_date > targetDateStr) continue;
    if (med.end_date && med.end_date < targetDateStr) continue;

    for (const time of med.scheduled_times) {
      const occurrenceIso = new Date(`${targetDateStr}T${time}:00`).toISOString();

      // Check if already taken or logged
      const matchingLog = doseLogs.find((l) => {
        if (l.medication_id !== med.id) return false;
        const logTime = new Date(l.scheduled_for).toISOString();
        return logTime === occurrenceIso || l.scheduled_for.startsWith(`${targetDateStr}T${time}`);
      });

      // If dose is taken, no alert needed
      if (matchingLog?.status === "taken") {
        continue;
      }

      const status: AlertStatus = matchingLog?.status === "snoozed" ? "snoozed" : "pending";
      const snoozedUntil = matchingLog?.snoozed_until || null;

      candidates.push({
        patient_id: patientId,
        type: "medication",
        title: `Medication Reminder: ${med.name}`,
        message: `Scheduled dose: ${med.dosage}. ${med.instructions || "Take with water as instructed."}`,
        related_medication_id: med.id,
        related_appointment_id: null,
        scheduled_for: occurrenceIso,
        status,
        acknowledged_at: null,
        snoozed_until: snoozedUntil,
        escalation_status: "not_required",
      });
    }
  }

  return candidates;
}

/**
 * Deterministically generates appointment alerts for scheduled visits
 */
export function generateAppointmentAlertCandidates(
  appointments: DbAppointment[],
  patientId: string,
  referenceDateStr?: string
): Omit<DbAlert, "id" | "created_at" | "updated_at">[] {
  const todayStr = referenceDateStr || new Date().toISOString().split("T")[0];
  const candidates: Omit<DbAlert, "id" | "created_at" | "updated_at">[] = [];

  for (const apt of appointments) {
    if (apt.status !== "scheduled") continue;
    // Alerts for today and upcoming appointments
    if (apt.appointment_date < todayStr) continue;

    const timePart = apt.appointment_time.length === 5 ? `${apt.appointment_time}:00` : apt.appointment_time;
    const scheduledIso = new Date(`${apt.appointment_date}T${timePart}`).toISOString();

    candidates.push({
      patient_id: patientId,
      type: "appointment",
      title: `Upcoming Consultation: ${apt.doctor_name || apt.title}`,
      message: `${apt.title} scheduled on ${apt.appointment_date} at ${apt.appointment_time.slice(0, 5)} at ${
        apt.location || "Medical Clinic"
      }.`,
      related_medication_id: null,
      related_appointment_id: apt.id,
      scheduled_for: scheduledIso,
      status: "pending",
      acknowledged_at: null,
      snoozed_until: null,
      escalation_status: "not_required",
    });
  }

  return candidates;
}

/**
 * Default alert preferences for new patients
 */
export const DEFAULT_ALERT_PREFERENCES: Omit<DbAlertPreferences, "id" | "patient_id" | "created_at" | "updated_at"> = {
  medication_reminders: true,
  appointment_reminders: true,
  assistance_escalation_enabled: true,
  preferred_care_circle_contact_id: null,
};

/**
 * Demo alerts for unauthenticated demonstration preview (Smt. Shanti Devi)
 */
export const DEMO_ALERTS: DbAlert[] = [
  {
    id: "demo-alert-med-1",
    patient_id: "demo-shanti-devi",
    type: "medication",
    title: "Medication Reminder: Amlodipine",
    message: "Scheduled dose: 5 mg. Take with water after breakfast.",
    related_medication_id: "demo-med-1",
    related_appointment_id: null,
    scheduled_for: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "pending",
    acknowledged_at: null,
    snoozed_until: null,
    escalation_status: "not_required",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-alert-apt-1",
    patient_id: "demo-shanti-devi",
    type: "appointment",
    title: "Upcoming Consultation: Dr. Anjali Mehta",
    message: "Cardiology follow-up tomorrow at 10:30 AM at Max Super Speciality Hospital, Saket.",
    related_medication_id: null,
    related_appointment_id: "demo-apt-1",
    scheduled_for: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: "pending",
    acknowledged_at: null,
    snoozed_until: null,
    escalation_status: "not_required",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-alert-assist-1",
    patient_id: "demo-shanti-devi",
    type: "assistance",
    title: "Assistance Request: Prescription Refill Support",
    message: "Request logged in CareCircle. Status: Prepared for follow-up with Pooja Sharma (Daughter).",
    related_medication_id: null,
    related_appointment_id: null,
    scheduled_for: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: "acknowledged",
    acknowledged_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    snoozed_until: null,
    escalation_status: "waiting",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
];
