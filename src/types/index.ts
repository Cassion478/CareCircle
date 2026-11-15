// CareCircle Base Domain Types

export type Role = "patient" | "caregiver" | "family_member";

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface PatientProfile {
  id: string;
  fullName: string;
  email?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  gender?: string;
  avatarUrl?: string;
  bloodGroup?: string;
  allergies?: string[];
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  age?: number;
  email: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  emergencyContact: EmergencyContact;
  conditions: string[];
  allergies: string[];
  createdAt: string;
}

// Database schema types for Phase 3
export interface DbMedication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  scheduled_times: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type DoseLogStatus = "pending" | "taken" | "snoozed" | "need_help";

export interface DbMedicationDoseLog {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_for: string; // ISO timestamptz
  status: DoseLogStatus;
  taken_at: string | null;
  snoozed_until: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

export type MedicationStatus = "scheduled" | "taken" | "missed" | "pending" | "snoozed" | "need_help";
export type TimeSlot = "morning" | "afternoon" | "evening" | "night";

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[]; // e.g. ["08:00", "20:00"]
  timeSlot: TimeSlot;
  timeLabel: string; // e.g. "8:00 AM"
  instructions: string;
  foodRequirement?: "with_food" | "before_food" | "after_food" | "empty_stomach";
  pillColor?: string;
  status: MedicationStatus;
  lastTaken?: string;
  snoozedUntil?: string;
  doseLogId?: string; // Phase 3 Supabase log reference
  scheduledFor?: string; // ISO string
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface Caregiver {
  id: string;
  name: string;
  relationship: string;
  role: "Primary Caregiver" | "Family Member" | "Home Health Aide";
  phone: string;
  email: string;
  avatarInitials: string;
  status: "Active" | "Away";
  lastCheckIn?: string;
}

export interface AlertNotification {
  id: string;
  patientId: string;
  medicationId?: string;
  type: "missed_medication" | "refill_reminder" | "appointment" | "emergency";
  title: string;
  message: string;
  severity: "info" | "warning" | "urgent";
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  createdAt: string;
}

export interface DailyProgressItem {
  day: string;
  percentage: number;
  allTaken: boolean;
  taken?: number;
  total?: number;
  completed?: boolean;
}

export interface AdherenceStats {
  takenToday?: number;
  totalScheduledToday?: number;
  takenThisWeek: number;
  totalScheduledThisWeek: number;
  currentStreakDays: number;
  weeklyPercentage: number | null;
  missedThisWeek?: number;
  dailyProgress?: DailyProgressItem[];
}

// Phase 4: Family Care Circle & Appointments Types
export type CareCircleMemberRole = "caregiver" | "emergency_contact";
export type CareCircleMemberStatus = "pending" | "active" | "revoked";

export interface DbCareCircleMember {
  id: string;
  patient_id: string;
  member_name: string;
  relationship: string;
  email: string | null;
  phone_number: string | null;
  role: CareCircleMemberRole;
  status: CareCircleMemberStatus;
  created_at: string;
  updated_at: string;
}
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export interface DbAppointment {
  id: string;
  patient_id: string;
  title: string;
  doctor_name: string | null;
  location: string | null;
  appointment_date: string;
  appointment_time: string;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}
// Phase 5: Smart Alerts & Escalation Types
export type AlertType = "medication" | "appointment" | "assistance";
export type AlertStatus = "pending" | "acknowledged" | "snoozed" | "resolved" | "cancelled";
export type EscalationStatus = "not_required" | "waiting" | "escalated" | "cancelled";

export interface DbAlert {
  id: string;
  patient_id: string;
  type: AlertType;
  title: string;
  message: string;
  related_medication_id?: string | null;
  related_appointment_id?: string | null;
  scheduled_for: string;
  status: AlertStatus;
  acknowledged_at?: string | null;
  snoozed_until?: string | null;
  escalation_status: EscalationStatus;
  created_at: string;
  updated_at: string;
}
export interface DbAlertPreferences {
  id: string;
  patient_id: string;
  medication_reminders: boolean;
  appointment_reminders: boolean;
  assistance_escalation_enabled: boolean;
  preferred_care_circle_contact_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Phase 8A: Multi-Channel Notification Infrastructure
export * from "./notifications";
