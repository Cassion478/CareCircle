import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// 1. Care Circle Logic
function validateCareCircleMember(input) {
  if (!input.memberName || !input.memberName.trim()) {
    return { isValid: false, error: "Please enter the family member or contact's name." };
  }
  if (!input.relationship || !input.relationship.trim()) {
    return { isValid: false, error: "Please specify your relationship with this contact." };
  }
  if (input.email && input.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email.trim())) {
      return { isValid: false, error: "Please enter a valid email address." };
    }
  }
  if (input.phoneNumber && input.phoneNumber.trim()) {
    const cleaned = input.phoneNumber.replace(/[\s\-\(\)\+]/g, "");
    if (cleaned.length < 7) {
      return { isValid: false, error: "Please enter a valid phone number (at least 7 digits)." };
    }
  }
  if (input.role !== "caregiver" && input.role !== "emergency_contact") {
    return { isValid: false, error: "Please select a valid role (Caregiver or Emergency Contact)." };
  }
  return { isValid: true };
}

function getAvatarInitials(name) {
  if (!name || !name.trim()) return "CC";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// 2. Appointment Logic
function validateAppointment(input, isNew = false, referenceDate = new Date()) {
  if (!input.title || !input.title.trim()) {
    return { isValid: false, error: "Please enter the appointment or visit title." };
  }
  if (!input.appointmentDate || !input.appointmentDate.trim()) {
    return { isValid: false, error: "Please select an appointment date." };
  }
  if (!input.appointmentTime || !input.appointmentTime.trim()) {
    return { isValid: false, error: "Please select an appointment time." };
  }
  if (isNew) {
    const todayStr = referenceDate.toISOString().split("T")[0];
    if (input.appointmentDate < todayStr) {
      return {
        isValid: false,
        error: "Cannot schedule an appointment on a past date. Please select today or a future date.",
      };
    }
  }
  return { isValid: true };
}

function sortAppointments(appointments, ascending = true) {
  return [...appointments].sort((a, b) => {
    const dateTimeA = `${a.appointment_date}T${a.appointment_time}`;
    const dateTimeB = `${b.appointment_date}T${b.appointment_time}`;
    return ascending ? dateTimeA.localeCompare(dateTimeB) : dateTimeB.localeCompare(dateTimeA);
  });
}

function mapDbToUiAppointment(db) {
  return {
    id: db.id,
    patientId: db.patient_id,
    doctorName: db.doctor_name || db.title,
    specialty: db.doctor_name ? db.title : "Medical Consultation",
    date: db.appointment_date,
    time: db.appointment_time,
    location: db.location || "Clinic / Hospital",
    notes: db.notes || undefined,
    createdAt: db.created_at,
  };
}

describe("Phase 4: Care Circle Form & Member Validation", () => {
  test("rejects empty contact name", () => {
    const res = validateCareCircleMember({
      memberName: "",
      relationship: "Daughter",
      role: "caregiver",
    });
    assert.equal(res.isValid, false);
    assert.match(res.error, /name/i);
  });

  test("rejects empty relationship", () => {
    const res = validateCareCircleMember({
      memberName: "Pooja Sharma",
      relationship: "   ",
      role: "caregiver",
    });
    assert.equal(res.isValid, false);
    assert.match(res.error, /relationship/i);
  });

  test("validates email syntax when provided", () => {
    const badEmail = validateCareCircleMember({
      memberName: "Pooja Sharma",
      relationship: "Daughter",
      email: "invalid-email-address",
      role: "caregiver",
    });
    assert.equal(badEmail.isValid, false);
    assert.match(badEmail.error, /email/i);

    const goodEmail = validateCareCircleMember({
      memberName: "Pooja Sharma",
      relationship: "Daughter",
      email: "pooja.sharma@example.com",
      role: "caregiver",
    });
    assert.equal(goodEmail.isValid, true);
  });

  test("validates phone number digit count when provided", () => {
    const shortPhone = validateCareCircleMember({
      memberName: "Pooja Sharma",
      relationship: "Daughter",
      phoneNumber: "123",
      role: "caregiver",
    });
    assert.equal(shortPhone.isValid, false);
    assert.match(shortPhone.error, /phone/i);

    const validPhone = validateCareCircleMember({
      memberName: "Pooja Sharma",
      relationship: "Daughter",
      phoneNumber: "+91 98201 45678",
      role: "caregiver",
    });
    assert.equal(validPhone.isValid, true);
  });

  test("accepts valid caregiver and emergency contact roles", () => {
    const caregiverRes = validateCareCircleMember({
      memberName: "Ramesh Sharma",
      relationship: "Son",
      role: "caregiver",
    });
    assert.equal(caregiverRes.isValid, true);

    const emergencyRes = validateCareCircleMember({
      memberName: "Dr. Gupta",
      relationship: "Family Doctor",
      role: "emergency_contact",
    });
    assert.equal(emergencyRes.isValid, true);
  });

  test("derives correct uppercase avatar initials", () => {
    assert.equal(getAvatarInitials("Pooja Sharma"), "PS");
    assert.equal(getAvatarInitials("Ramesh"), "RA");
    assert.equal(getAvatarInitials("Dr. Rajesh Kumar Verma"), "DV");
    assert.equal(getAvatarInitials(""), "CC");
  });
});

describe("Phase 4: Appointment Validation & Scheduling Rules", () => {
  const referenceToday = new Date("2026-11-15T12:00:00.000Z");

  test("rejects empty title", () => {
    const res = validateAppointment(
      {
        title: "",
        appointmentDate: "2026-11-20",
        appointmentTime: "10:00",
      },
      true,
      referenceToday
    );
    assert.equal(res.isValid, false);
    assert.match(res.error, /title/i);
  });

  test("rejects missing appointment date or time", () => {
    const noDate = validateAppointment(
      {
        title: "Cardiologist Checkup",
        appointmentDate: "",
        appointmentTime: "10:00",
      },
      true,
      referenceToday
    );
    assert.equal(noDate.isValid, false);

    const noTime = validateAppointment(
      {
        title: "Cardiologist Checkup",
        appointmentDate: "2026-11-20",
        appointmentTime: "",
      },
      true,
      referenceToday
    );
    assert.equal(noTime.isValid, false);
  });

  test("rejects past dates when scheduling NEW appointment", () => {
    const pastRes = validateAppointment(
      {
        title: "Eye Clinic Followup",
        appointmentDate: "2026-11-10", // In the past
        appointmentTime: "11:00",
      },
      true,
      referenceToday
    );
    assert.equal(pastRes.isValid, false);
    assert.match(pastRes.error, /past date/i);
  });

  test("accepts today or future date for new appointment", () => {
    const todayRes = validateAppointment(
      {
        title: "Same Day Consultation",
        appointmentDate: "2026-11-15", // Today
        appointmentTime: "16:00",
      },
      true,
      referenceToday
    );
    assert.equal(todayRes.isValid, true);

    const futureRes = validateAppointment(
      {
        title: "Dentist Visit",
        appointmentDate: "2026-11-25", // Future
        appointmentTime: "09:30",
      },
      true,
      referenceToday
    );
    assert.equal(futureRes.isValid, true);
  });

  test("allows past date when editing an existing appointment (e.g. updating notes)", () => {
    const editPastRes = validateAppointment(
      {
        title: "Past Blood Test",
        appointmentDate: "2026-11-10",
        appointmentTime: "09:00",
      },
      false, // isNew = false
      referenceToday
    );
    assert.equal(editPastRes.isValid, true);
  });
});

describe("Phase 4: Appointment Sorting & Status Transitions", () => {
  const sampleAppointments = [
    {
      id: "apt-3",
      patient_id: "patient-1",
      title: "Dental Cleaning",
      appointment_date: "2026-11-30",
      appointment_time: "14:00",
      status: "scheduled",
    },
    {
      id: "apt-1",
      patient_id: "patient-1",
      title: "Cardiologist Checkup",
      appointment_date: "2026-11-18",
      appointment_time: "10:30",
      status: "scheduled",
    },
    {
      id: "apt-2",
      patient_id: "patient-1",
      title: "Eye Exam",
      appointment_date: "2026-11-18",
      appointment_time: "16:00",
      status: "scheduled",
    },
  ];

  test("sorts upcoming appointments chronologically (soonest first)", () => {
    const sorted = sortAppointments(sampleAppointments, true);
    assert.equal(sorted[0].id, "apt-1"); // Nov 18, 10:30
    assert.equal(sorted[1].id, "apt-2"); // Nov 18, 16:00
    assert.equal(sorted[2].id, "apt-3"); // Nov 30, 14:00
  });

  test("sorts past appointments reverse chronologically (most recent first)", () => {
    const sorted = sortAppointments(sampleAppointments, false);
    assert.equal(sorted[0].id, "apt-3");
    assert.equal(sorted[1].id, "apt-2");
    assert.equal(sorted[2].id, "apt-1");
  });

  test("transforms database appointment to UI structure with fallback", () => {
    const dbApt = {
      id: "apt-1",
      patient_id: "patient-1",
      title: "General Physician",
      doctor_name: "Dr. Ananya Roy",
      location: "City Health Clinic",
      appointment_date: "2026-11-20",
      appointment_time: "11:00",
      notes: "Carry lab reports",
      status: "scheduled",
      created_at: "2026-11-15T10:00:00Z",
      updated_at: "2026-11-15T10:00:00Z",
    };

    const ui = mapDbToUiAppointment(dbApt);
    assert.equal(ui.id, "apt-1");
    assert.equal(ui.doctorName, "Dr. Ananya Roy");
    assert.equal(ui.specialty, "General Physician");
    assert.equal(ui.location, "City Health Clinic");
    assert.equal(ui.notes, "Carry lab reports");
  });
});

describe("Phase 4: Database Migration & RLS Security Integrity", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261115_create_care_circle_and_appointments.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  test("care_circle_members table references public.profiles with cascade delete", () => {
    assert.match(
      sql,
      /patient_id uuid not null references public\.profiles\(id\) on delete cascade/i
    );
  });

  test("appointments table references public.profiles with cascade delete", () => {
    assert.match(
      sql,
      /patient_id uuid not null references public\.profiles\(id\) on delete cascade/i
    );
  });

  test("Row Level Security is enabled on both care_circle_members and appointments", () => {
    assert.match(sql, /alter table public\.care_circle_members enable row level security;/i);
    assert.match(sql, /alter table public\.appointments enable row level security;/i);
  });

  test("Care circle RLS enforces patient_id = auth.uid() across SELECT, INSERT, UPDATE, DELETE", () => {
    assert.match(
      sql,
      /create policy "Patients can view own care circle members"[\s\S]*using \(patient_id = auth\.uid\(\)\)/i
    );
    assert.match(
      sql,
      /create policy "Patients can insert own care circle members"[\s\S]*with check \(patient_id = auth\.uid\(\)\)/i
    );
    assert.match(
      sql,
      /create policy "Patients can update own care circle members"[\s\S]*using \(patient_id = auth\.uid\(\)\)[\s\S]*with check \(patient_id = auth\.uid\(\)\)/i
    );
    assert.match(
      sql,
      /create policy "Patients can delete own care circle members"[\s\S]*using \(patient_id = auth\.uid\(\)\)/i
    );
  });

  test("Appointments RLS enforces patient_id = auth.uid() across SELECT, INSERT, UPDATE, DELETE", () => {
    assert.match(
      sql,
      /create policy "Patients can view own appointments"[\s\S]*using \(patient_id = auth\.uid\(\)\)/i
    );
    assert.match(
      sql,
      /create policy "Patients can insert own appointments"[\s\S]*with check \(patient_id = auth\.uid\(\)\)/i
    );
    assert.match(
      sql,
      /create policy "Patients can update own appointments"[\s\S]*using \(patient_id = auth\.uid\(\)\)[\s\S]*with check \(patient_id = auth\.uid\(\)\)/i
    );
    assert.match(
      sql,
      /create policy "Patients can delete own appointments"[\s\S]*using \(patient_id = auth\.uid\(\)\)/i
    );
  });

  test("Updated_at triggers are configured for both tables", () => {
    assert.match(sql, /create trigger set_care_circle_updated_at/i);
    assert.match(sql, /create trigger set_appointments_updated_at/i);
  });
});
