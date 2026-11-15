import { DbAppointment, Appointment, AppointmentStatus } from "@/types";
import { formatTimeLabel } from "./medications";

export interface AppointmentInput {
  title: string;
  doctorName?: string | null;
  location?: string | null;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  notes?: string | null;
  status?: AppointmentStatus;
}

export function validateAppointment(
  input: AppointmentInput,
  isNew: boolean = false,
  referenceDate: Date = new Date()
): { isValid: boolean; error?: string } {
  if (!input.title || !input.title.trim()) {
    return { isValid: false, error: "Please enter the appointment or visit title." };
  }

  if (!input.appointmentDate || !input.appointmentDate.trim()) {
    return { isValid: false, error: "Please select an appointment date." };
  }

  if (!input.appointmentTime || !input.appointmentTime.trim()) {
    return { isValid: false, error: "Please select an appointment time." };
  }

  // Prevent past dates when creating new appointments
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

export function formatAppointmentDate(dateStr: string): string {
  if (!dateStr) return "";
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
  const d = new Date(year, month, day);

  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatAppointmentTime(timeStr: string): string {
  if (!timeStr) return "";
  return formatTimeLabel(timeStr);
}

export function sortAppointments(
  appointments: DbAppointment[],
  ascending: boolean = true
): DbAppointment[] {
  return [...appointments].sort((a, b) => {
    const dateTimeA = `${a.appointment_date}T${a.appointment_time}`;
    const dateTimeB = `${b.appointment_date}T${b.appointment_time}`;
    return ascending ? dateTimeA.localeCompare(dateTimeB) : dateTimeB.localeCompare(dateTimeA);
  });
}

export function mapDbToUiAppointment(db: DbAppointment): Appointment {
  return {
    id: db.id,
    patientId: db.patient_id,
    doctorName: db.doctor_name || db.title,
    specialty: db.doctor_name ? db.title : "Medical Consultation",
    date: formatAppointmentDate(db.appointment_date),
    time: formatAppointmentTime(db.appointment_time),
    location: db.location || "Clinic / Hospital",
    notes: db.notes || undefined,
    createdAt: db.created_at,
  };
}
