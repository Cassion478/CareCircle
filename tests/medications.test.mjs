import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function getTimeSlot(timeStr) {
  const [hourStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return "morning";
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function formatTimeLabel(timeStr) {
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const min = minStr || "00";
  if (isNaN(hour)) return timeStr;
  const period = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${formattedHour}:${min} ${period}`;
}

function validateMedication(input) {
  if (!input.name || !input.name.trim()) {
    return { isValid: false, error: "Please enter the medication name." };
  }
  if (!input.dosage || !input.dosage.trim()) {
    return { isValid: false, error: "Please enter the dosage (e.g. 500 mg, 1 tablet)." };
  }
  if (!input.scheduledTimes || input.scheduledTimes.length === 0) {
    return { isValid: false, error: "Please select at least one scheduled daily time." };
  }
  if (!input.startDate) {
    return { isValid: false, error: "Please enter a start date." };
  }
  if (input.endDate && input.endDate.trim()) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (end < start) {
      return { isValid: false, error: "End date cannot be earlier than start date." };
    }
  }
  return { isValid: true };
}

function buildTodaySchedule(medications, logs, targetDate = new Date()) {
  const targetDateStr = targetDate.toISOString().split("T")[0];
  const scheduleItems = [];

  for (const med of medications) {
    if (!med.is_active) continue;
    if (med.start_date > targetDateStr) continue;
    if (med.end_date && med.end_date < targetDateStr) continue;

    for (const time of med.scheduled_times) {
      const occurrenceTime = `${targetDateStr}T${time}:00`;
      const occurrenceIso = new Date(occurrenceTime).toISOString();

      const matchingLog = logs.find((l) => {
        if (l.medication_id !== med.id) return false;
        const logTime = new Date(l.scheduled_for).toISOString();
        return logTime === occurrenceIso || l.scheduled_for.startsWith(`${targetDateStr}T${time}`);
      });

      const status = matchingLog ? matchingLog.status : "pending";
      const lastTaken = matchingLog?.taken_at
        ? new Date(matchingLog.taken_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : undefined;

      const snoozedUntil = matchingLog?.snoozed_until
        ? new Date(matchingLog.snoozed_until).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : undefined;

      scheduleItems.push({
        id: med.id,
        patientId: med.patient_id,
        name: med.name,
        dosage: med.dosage,
        frequency: `${med.scheduled_times.length} times daily`,
        times: med.scheduled_times,
        timeSlot: getTimeSlot(time),
        timeLabel: formatTimeLabel(time),
        instructions: med.instructions || "Take as instructed by your physician.",
        status,
        lastTaken: lastTaken ? `Today, ${lastTaken}` : undefined,
        snoozedUntil: snoozedUntil ? `Snoozed until ${snoozedUntil}` : undefined,
        doseLogId: matchingLog?.id,
        scheduledFor: occurrenceIso,
        createdAt: med.created_at || new Date().toISOString(),
      });
    }
  }

  scheduleItems.sort((a, b) => {
    const timeA = a.scheduledFor || "";
    const timeB = b.scheduledFor || "";
    return timeA.localeCompare(timeB);
  });

  return scheduleItems;
}

describe("Phase 3: Medication Form Validation", () => {
  test("validates required name", () => {
    const res = validateMedication({
      name: "",
      dosage: "500 mg",
      startDate: "2026-11-15",
      scheduledTimes: ["08:00"],
    });
    assert.equal(res.isValid, false);
    assert.match(res.error, /name/i);
  });

  test("validates required dosage", () => {
    const res = validateMedication({
      name: "Metformin",
      dosage: "  ",
      startDate: "2026-11-15",
      scheduledTimes: ["08:00"],
    });
    assert.equal(res.isValid, false);
    assert.match(res.error, /dosage/i);
  });

  test("validates that at least one time is selected", () => {
    const res = validateMedication({
      name: "Metformin",
      dosage: "500 mg",
      startDate: "2026-11-15",
      scheduledTimes: [],
    });
    assert.equal(res.isValid, false);
    assert.match(res.error, /time/i);
  });

  test("rejects end date earlier than start date", () => {
    const res = validateMedication({
      name: "Amoxicillin",
      dosage: "250 mg",
      startDate: "2026-11-20",
      endDate: "2026-11-15",
      scheduledTimes: ["08:00"],
    });
    assert.equal(res.isValid, false);
    assert.match(res.error, /end date/i);
  });

  test("accepts valid medication input", () => {
    const res = validateMedication({
      name: "Amlodipine",
      dosage: "5 mg",
      startDate: "2026-11-15",
      endDate: "2026-12-15",
      scheduledTimes: ["08:00", "20:00"],
    });
    assert.equal(res.isValid, true);
  });
});

describe("Phase 3: Routine Times & Label Formatting", () => {
  test("categorizes 24-hr times into elderly routine slots", () => {
    assert.equal(getTimeSlot("08:00"), "morning");
    assert.equal(getTimeSlot("13:00"), "afternoon");
    assert.equal(getTimeSlot("18:30"), "evening");
    assert.equal(getTimeSlot("21:00"), "night");
    assert.equal(getTimeSlot("01:00"), "night");
  });

  test("formats 24-hr time into 12-hr display label", () => {
    assert.equal(formatTimeLabel("08:00"), "8:00 AM");
    assert.equal(formatTimeLabel("12:00"), "12:00 PM");
    assert.equal(formatTimeLabel("13:30"), "1:30 PM");
    assert.equal(formatTimeLabel("20:15"), "8:15 PM");
    assert.equal(formatTimeLabel("00:00"), "12:00 AM");
  });
});

describe("Phase 3: Daily Medication Schedule Generation", () => {
  const sampleMeds = [
    {
      id: "med-1",
      patient_id: "patient-1",
      name: "Metformin",
      dosage: "500 mg",
      instructions: "Take after breakfast",
      start_date: "2026-11-01",
      end_date: null,
      scheduled_times: ["08:00", "20:00"],
      is_active: true,
    },
    {
      id: "med-2",
      patient_id: "patient-1",
      name: "Amlodipine",
      dosage: "5 mg",
      instructions: "Take with water",
      start_date: "2026-11-01",
      end_date: null,
      scheduled_times: ["09:00"],
      is_active: true,
    },
    {
      id: "med-paused",
      patient_id: "patient-1",
      name: "Multivitamin",
      dosage: "1 capsule",
      instructions: null,
      start_date: "2026-11-01",
      end_date: null,
      scheduled_times: ["10:00"],
      is_active: false,
    },
  ];

  test("generates today schedule ordered chronologically and excludes paused meds", () => {
    const today = new Date("2026-11-15T00:00:00.000Z");
    const schedule = buildTodaySchedule(sampleMeds, [], today);

    assert.equal(schedule.length, 3);
    assert.equal(schedule[0].name, "Metformin");
    assert.equal(schedule[0].timeLabel, "8:00 AM");
    assert.equal(schedule[1].name, "Amlodipine");
    assert.equal(schedule[1].timeLabel, "9:00 AM");
    assert.equal(schedule[2].name, "Metformin");
    assert.equal(schedule[2].timeLabel, "8:00 PM");
    assert.equal(schedule[0].status, "pending");
  });

  test("matches dose logs with taken and snooze state", () => {
    const today = new Date("2026-11-15T00:00:00.000Z");
    const sampleLogs = [
      {
        id: "log-1",
        medication_id: "med-1",
        patient_id: "patient-1",
        scheduled_for: "2026-11-15T08:00:00.000Z",
        status: "taken",
        taken_at: "2026-11-15T08:05:00.000Z",
        snoozed_until: null,
        note: null,
      },
      {
        id: "log-2",
        medication_id: "med-2",
        patient_id: "patient-1",
        scheduled_for: "2026-11-15T09:00:00.000Z",
        status: "snoozed",
        taken_at: null,
        snoozed_until: "2026-11-15T09:10:00.000Z",
        note: null,
      },
    ];

    const schedule = buildTodaySchedule(sampleMeds, sampleLogs, today);

    assert.equal(schedule[0].status, "taken");
    assert.match(schedule[0].lastTaken, /Today/);
    assert.equal(schedule[1].status, "snoozed");
    assert.match(schedule[1].snoozedUntil, /Snoozed until/);
  });
});

describe("Phase 3: Database Migration & RLS Security Rules", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261115_create_medications.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  test("medications table has patient_id foreign key referencing profiles with cascade delete", () => {
    assert.match(sql, /patient_id uuid references public\.profiles\(id\) on delete cascade/i);
  });

  test("medication_dose_logs has foreign keys and unique constraint preventing duplicate doses", () => {
    assert.match(sql, /medication_id uuid references public\.medications\(id\) on delete cascade/i);
    assert.match(sql, /patient_id uuid references public\.profiles\(id\) on delete cascade/i);
    assert.match(sql, /unique\s*\(\s*medication_id\s*,\s*scheduled_for\s*\)/i);
  });

  test("Row Level Security is enabled on both medications and dose logs tables", () => {
    assert.match(sql, /alter table public\.medications enable row level security;/i);
    assert.match(sql, /alter table public\.medication_dose_logs enable row level security;/i);
  });

  test("Medications policies enforce patient_id = auth.uid() across SELECT, INSERT, UPDATE, DELETE", () => {
    assert.match(sql, /create policy "Patients can view own medications"[\s\S]*using \(patient_id = auth\.uid\(\)\)/i);
    assert.match(sql, /create policy "Patients can insert own medications"[\s\S]*with check \(patient_id = auth\.uid\(\)\)/i);
    assert.match(sql, /create policy "Patients can update own medications"[\s\S]*using \(patient_id = auth\.uid\(\)\)/i);
    assert.match(sql, /create policy "Patients can delete own medications"[\s\S]*using \(patient_id = auth\.uid\(\)\)/i);
  });

  test("Dose logs RLS prevents logging doses for another patient's medication", () => {
    assert.match(sql, /create policy "Patients can insert own dose logs"[\s\S]*exists \(\s*select 1 from public\.medications m\s*where m\.id = medication_id and m\.patient_id = auth\.uid\(\)\s*\)/i);
  });
});
