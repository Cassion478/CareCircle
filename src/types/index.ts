// CareCircle Base Domain Types

export type Role = "patient" | "caregiver" | "family_member";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  conditions?: string[];
  allergies?: string[];
  createdAt: string;
}

export type MedicationStatus = "scheduled" | "taken" | "missed" | "pending";

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[]; // e.g. ["08:00", "20:00"]
  instructions?: string;
  status: MedicationStatus;
  lastTaken?: string;
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
  notes?: string;
  createdAt: string;
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
