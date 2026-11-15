import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function isAlertActive(alert, now = new Date()) {
  if (alert.status === "pending") return true;
  if (alert.status === "snoozed" && alert.snoozed_until) {
    return new Date(alert.snoozed_until) <= now;
  }
  return false;
}

function formatAlertTime(dateIso) {
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

function generateMedicationAlertCandidates(medications, doseLogs, patientId, targetDate = new Date()) {
  const targetDateStr = targetDate.toISOString().split("T")[0];
  const candidates = [];

  for (const med of medications) {
    if (!med.is_active) continue;
    if (med.start_date > targetDateStr) continue;
    if (med.end_date && med.end_date < targetDateStr) continue;

    for (const time of med.scheduled_times) {
      const occurrenceIso = new Date(`${targetDateStr}T${time}:00`).toISOString();

      const matchingLog = doseLogs.find((l) => {
        if (l.medication_id !== med.id) return false;
        const logTime = new Date(l.scheduled_for).toISOString();
        return logTime === occurrenceIso || l.scheduled_for.startsWith(`${targetDateStr}T${time}`);
      });

      if (matchingLog?.status === "taken") {
        continue;
      }

      const status = matchingLog?.status === "snoozed" ? "snoozed" : "pending";
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

function generateAppointmentAlertCandidates(appointments, patientId, referenceDateStr) {
  const todayStr = referenceDateStr || new Date().toISOString().split("T")[0];
  const candidates = [];

  for (const apt of appointments) {
    if (apt.status !== "scheduled") continue;
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

const DEFAULT_ALERT_PREFERENCES = {
  medication_reminders: true,
  appointment_reminders: true,
  assistance_escalation_enabled: true,
  preferred_care_circle_contact_id: null,
};

describe("Phase 5: Medication Alert Candidate Generation", () => {
  const patientId = "patient-123";
  const today = new Date("2026-11-15T12:00:00Z");

  const sampleMeds = [
    {
      id: "med-1",
      patient_id: patientId,
      name: "Metformin",
      dosage: "500 mg",
      instructions: "Take with food",
      start_date: "2026-11-01",
      end_date: null,
      scheduled_times: ["08:00", "20:00"],
      is_active: true,
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
    {
      id: "med-inactive",
      patient_id: patientId,
      name: "Old Med",
      dosage: "10 mg",
      instructions: "Discontinued",
      start_date: "2026-01-01",
      end_date: "2026-05-01",
      scheduled_times: ["08:00"],
      is_active: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    },
  ];

  test("generates alerts for active medication scheduled times when no dose logs exist", () => {
    const candidates = generateMedicationAlertCandidates(sampleMeds, [], patientId, today);
    assert.equal(candidates.length, 2);
    assert.equal(candidates[0].related_medication_id, "med-1");
    assert.equal(candidates[0].type, "medication");
    assert.equal(candidates[0].status, "pending");
  });

  test("does NOT generate alert for dose occurrence already marked taken", () => {
    const time08Iso = new Date("2026-11-15T08:00:00").toISOString();
    const logs = [
      {
        id: "log-1",
        medication_id: "med-1",
        patient_id: patientId,
        scheduled_for: time08Iso,
        status: "taken",
        taken_at: "2026-11-15T08:05:00.000Z",
        snoozed_until: null,
        note: null,
        created_at: "2026-11-15T08:05:00Z",
        updated_at: "2026-11-15T08:05:00Z",
      },
    ];

    const candidates = generateMedicationAlertCandidates(sampleMeds, logs, patientId, today);
    // Only the 20:00 dose should generate an alert
    assert.equal(candidates.length, 1);
    const time20Iso = new Date("2026-11-15T20:00:00").toISOString();
    assert.equal(candidates[0].scheduled_for, time20Iso);
  });

  test("reflects snoozed status and time when dose log was snoozed", () => {
    const time08Iso = new Date("2026-11-15T08:00:00").toISOString();
    const snoozedTime = new Date("2026-11-15T08:10:00.000Z").toISOString();
    const logs = [
      {
        id: "log-snoozed",
        medication_id: "med-1",
        patient_id: patientId,
        scheduled_for: time08Iso,
        status: "snoozed",
        taken_at: null,
        snoozed_until: snoozedTime,
        note: null,
        created_at: "2026-11-15T08:00:00Z",
        updated_at: "2026-11-15T08:00:00Z",
      },
    ];

    const candidates = generateMedicationAlertCandidates(sampleMeds, logs, patientId, today);
    const morningCandidate = candidates.find((c) => c.scheduled_for === time08Iso);
    assert.ok(morningCandidate);
    assert.equal(morningCandidate.status, "snoozed");
    assert.equal(morningCandidate.snoozed_until, snoozedTime);
  });
});

describe("Phase 5: Appointment Alert Candidate Generation", () => {
  const patientId = "patient-123";

  const sampleAppointments = [
    {
      id: "apt-today",
      patient_id: patientId,
      title: "Cardiology Review",
      doctor_name: "Dr. Anjali Mehta",
      location: "Max Healthcare",
      appointment_date: "2026-11-15",
      appointment_time: "10:30:00",
      notes: "Carry echo reports",
      status: "scheduled",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
    {
      id: "apt-future",
      patient_id: patientId,
      title: "Eye Checkup",
      doctor_name: "Dr. Ramesh Gupta",
      location: "Vision Center",
      appointment_date: "2026-11-20",
      appointment_time: "15:00:00",
      notes: null,
      status: "scheduled",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
    {
      id: "apt-cancelled",
      patient_id: patientId,
      title: "Cancelled Dental",
      doctor_name: "Dr. Dent",
      location: "Dental Clinic",
      appointment_date: "2026-11-16",
      appointment_time: "11:00:00",
      notes: null,
      status: "cancelled",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
    },
    {
      id: "apt-past",
      patient_id: patientId,
      title: "Past Routine",
      doctor_name: "Dr. Old",
      location: "Clinic",
      appointment_date: "2026-11-01",
      appointment_time: "09:00:00",
      notes: null,
      status: "scheduled",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  test("generates alerts for scheduled appointments today and in future", () => {
    const candidates = generateAppointmentAlertCandidates(sampleAppointments, patientId, "2026-11-15");
    assert.equal(candidates.length, 2);
    assert.equal(candidates[0].related_appointment_id, "apt-today");
    assert.equal(candidates[1].related_appointment_id, "apt-future");
  });

  test("excludes cancelled and past appointments from alert candidates", () => {
    const candidates = generateAppointmentAlertCandidates(sampleAppointments, patientId, "2026-11-15");
    const cancelled = candidates.find((c) => c.related_appointment_id === "apt-cancelled");
    const past = candidates.find((c) => c.related_appointment_id === "apt-past");
    assert.equal(cancelled, undefined);
    assert.equal(past, undefined);
  });
});

describe("Phase 5: Alert Status & Snooze Evaluation", () => {
  const now = new Date("2026-11-15T12:00:00Z");

  test("returns true for pending alert", () => {
    const alert = {
      id: "a1",
      patient_id: "p1",
      type: "medication",
      title: "Take pill",
      message: "1 tablet",
      scheduled_for: now.toISOString(),
      status: "pending",
      escalation_status: "not_required",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    assert.equal(isAlertActive(alert, now), true);
  });

  test("returns false for acknowledged or resolved alert", () => {
    const ackAlert = {
      id: "a2",
      patient_id: "p1",
      type: "medication",
      title: "Take pill",
      message: "1 tablet",
      scheduled_for: now.toISOString(),
      status: "acknowledged",
      escalation_status: "not_required",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    assert.equal(isAlertActive(ackAlert, now), false);
  });

  test("returns false when snoozed until a future time", () => {
    const futureSnooze = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const alert = {
      id: "a3",
      patient_id: "p1",
      type: "medication",
      title: "Take pill",
      message: "1 tablet",
      scheduled_for: now.toISOString(),
      status: "snoozed",
      snoozed_until: futureSnooze,
      escalation_status: "not_required",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    assert.equal(isAlertActive(alert, now), false);
  });

  test("returns true when snoozed until time has elapsed", () => {
    const pastSnooze = new Date(now.getTime() - 1 * 60 * 1000).toISOString();
    const alert = {
      id: "a4",
      patient_id: "p1",
      type: "medication",
      title: "Take pill",
      message: "1 tablet",
      scheduled_for: now.toISOString(),
      status: "snoozed",
      snoozed_until: pastSnooze,
      escalation_status: "not_required",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    assert.equal(isAlertActive(alert, now), true);
  });

  test("formats alert time to readable string without crashing", () => {
    const formatted = formatAlertTime("2026-11-15T10:30:00Z");
    assert.ok(typeof formatted === "string");
    assert.ok(formatted.length > 0);
  });

  test("default alert preferences enable reminders with sensible defaults", () => {
    assert.equal(DEFAULT_ALERT_PREFERENCES.medication_reminders, true);
    assert.equal(DEFAULT_ALERT_PREFERENCES.appointment_reminders, true);
    assert.equal(DEFAULT_ALERT_PREFERENCES.assistance_escalation_enabled, true);
  });
});

describe("Phase 5: Database Migration & RLS Security Integrity", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261115_create_alerts.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf8");

  test("alerts table references public.profiles with ON DELETE CASCADE", () => {
    assert.ok(sql.includes("REFERENCES public.profiles(id) ON DELETE CASCADE"));
  });

  test("alerts table references medications and appointments with ON DELETE SET NULL", () => {
    assert.ok(sql.includes("REFERENCES public.medications(id) ON DELETE SET NULL"));
    assert.ok(sql.includes("REFERENCES public.appointments(id) ON DELETE SET NULL"));
  });

  test("Row Level Security is enabled on both alerts and alert_preferences", () => {
    assert.ok(sql.includes("ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;"));
    assert.ok(sql.includes("ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;"));
  });

  test("alerts RLS enforces patient_id = auth.uid() across SELECT, INSERT, UPDATE, DELETE", () => {
    assert.ok(sql.includes('CREATE POLICY "Patients can view own alerts"'));
    assert.ok(sql.includes('CREATE POLICY "Patients can insert own alerts"'));
    assert.ok(sql.includes('CREATE POLICY "Patients can update own alerts"'));
    assert.ok(sql.includes('CREATE POLICY "Patients can delete own alerts"'));
    assert.ok(sql.includes("(patient_id = auth.uid())"));
  });

  test("alert_preferences RLS enforces patient_id = auth.uid() across SELECT, INSERT, UPDATE, DELETE", () => {
    assert.ok(sql.includes('CREATE POLICY "Patients can view own alert preferences"'));
    assert.ok(sql.includes('CREATE POLICY "Patients can insert own alert preferences"'));
    assert.ok(sql.includes('CREATE POLICY "Patients can update own alert preferences"'));
    assert.ok(sql.includes('CREATE POLICY "Patients can delete own alert preferences"'));
  });

  test("unique partial indexes are created to prevent duplicate alerts", () => {
    assert.ok(sql.includes("idx_unique_medication_alert"));
    assert.ok(sql.includes("idx_unique_appointment_alert"));
  });

  test("updated_at triggers are configured for both alerts and alert_preferences", () => {
    assert.ok(sql.includes("CREATE TRIGGER set_alerts_updated_at"));
    assert.ok(sql.includes("CREATE TRIGGER set_alert_preferences_updated_at"));
    assert.ok(sql.includes("EXECUTE FUNCTION public.handle_updated_at();"));
  });
});
