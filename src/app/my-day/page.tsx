"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, User, Sparkles, Pill, Plus } from "lucide-react";
import { PatientHeader } from "@/components/dashboard/PatientHeader";
import { MedicationTimeline } from "@/components/dashboard/MedicationTimeline";
import { AppointmentsWidget } from "@/components/dashboard/AppointmentsWidget";
import { AdherenceWidget } from "@/components/dashboard/AdherenceWidget";
import { CareCircleWidget } from "@/components/dashboard/CareCircleWidget";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { EmergencyModal } from "@/components/dashboard/EmergencyModal";
import { HelpModal } from "@/components/dashboard/HelpModal";
import {
  DEMO_PATIENT,
  DEMO_MEDICATIONS,
  DEMO_APPOINTMENTS,
  DEMO_CAREGIVERS,
  DEMO_ADHERENCE,
} from "@/lib/demo-data";
import { Medication, AdherenceStats, UserProfile, DbMedication, Appointment, Caregiver, DbAlert } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { buildTodaySchedule } from "@/lib/medications";
import { mapDbToUiAppointment } from "@/lib/appointments";
import { getAvatarInitials } from "@/lib/care-circle";
import { DEMO_ALERTS } from "@/lib/alerts";

export default function MyDayPage() {
  const { user, profile } = useAuth();
  const [medications, setMedications] = useState<Medication[]>(DEMO_MEDICATIONS);
  const [userDbMeds, setUserDbMeds] = useState<DbMedication[]>([]);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [helpMed, setHelpMed] = useState<Medication | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingMeds, setIsLoadingMeds] = useState(false);
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
  const [userCaregivers, setUserCaregivers] = useState<Caregiver[]>([]);
  const [userAlerts, setUserAlerts] = useState<DbAlert[]>([]);

  // Security & Data Isolation:
  // When logged in, strictly derive patient profile from authenticated user.
  // Never leak or mix demo patient details (Smt. Shanti Devi / Pooja) into an authenticated session.
  const activePatient: UserProfile = user
    ? {
        id: user.id,
        name: profile?.fullName || user.user_metadata?.full_name || "Patient",
        email: user.email || "",
        role: "patient",
        phone: profile?.phoneNumber || user.user_metadata?.phone_number || undefined,
        avatarUrl: profile?.avatarUrl || undefined,
        emergencyContact: {
          name:
            profile?.emergencyContactName ||
            user.user_metadata?.emergency_contact_name ||
            "Primary Family Contact",
          relationship:
            profile?.emergencyContactRelationship ||
            user.user_metadata?.emergency_contact_relationship ||
            "Family Member",
          phone:
            profile?.emergencyContactPhone ||
            user.user_metadata?.emergency_contact_phone ||
            "None configured",
        },
        conditions: [],
        allergies: profile?.allergies || [],
        createdAt: profile?.createdAt || user.created_at || "2026-11-15T00:00:00.000Z",
      }
    : DEMO_PATIENT;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Load today's persistent medications & dose logs from Supabase
  const loadPersistentDoses = useCallback(async (userId: string) => {
    setIsLoadingMeds(true);
    try {
      const supabase = createClient();

      // Fetch active medications
      const { data: meds, error: medsErr } = await supabase
        .from("medications")
        .select("*")
        .eq("patient_id", userId)
        .eq("is_active", true);

      if (medsErr) {
        console.warn("Could not load medications:", medsErr.message);
        setIsLoadingMeds(false);
        return;
      }

      setUserDbMeds(meds || []);

      if (meds && meds.length > 0) {
        // Fetch today's logs
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: logs, error: logsErr } = await supabase
          .from("medication_dose_logs")
          .select("*")
          .eq("patient_id", userId)
          .gte("scheduled_for", `${todayStr}T00:00:00.000Z`)
          .lte("scheduled_for", `${todayStr}T23:59:59.999Z`);

        if (logsErr) {
          console.warn("Could not load dose logs:", logsErr.message);
        }

        const todaySchedule = buildTodaySchedule(meds, logs || [], new Date());
        setMedications(todaySchedule);
      } else {
        // User has no custom medications yet
        setMedications([]);
      }

      // Fetch upcoming appointments
      const todayDateStr = new Date().toISOString().split("T")[0];
      const { data: aptData } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", userId)
        .gte("appointment_date", todayDateStr)
        .eq("status", "scheduled")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(5);

      if (aptData) {
        setUserAppointments(aptData.map(mapDbToUiAppointment));
      } else {
        setUserAppointments([]);
      }

      // Fetch active Care Circle members
      const { data: memberData } = await supabase
        .from("care_circle_members")
        .select("*")
        .eq("patient_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (memberData) {
        setUserCaregivers(
          memberData.map((m) => ({
            id: m.id,
            name: m.member_name,
            relationship: m.relationship,
            role: m.role === "emergency_contact" ? "Primary Caregiver" : "Family Member",
            phone: m.phone_number || "",
            email: m.email || "",
            avatarInitials: getAvatarInitials(m.member_name),
            status: "Active",
          }))
        );
      } else {
        setUserCaregivers([]);
      }

      // Fetch active alerts
      const { data: alertData } = await supabase
        .from("alerts")
        .select("*")
        .eq("patient_id", userId)
        .in("status", ["pending", "snoozed"])
        .order("scheduled_for", { ascending: false })
        .limit(6);

      if (alertData) {
        setUserAlerts(alertData);
      } else {
        setUserAlerts([]);
      }
    } catch (err) {
      console.warn("Error loading daily schedule:", err);
    } finally {
      setIsLoadingMeds(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      await Promise.resolve();
      if (isCancelled) return;

      if (user) {
        await loadPersistentDoses(user.id);
      } else {
        // Unauthenticated visitor: use demo medications in local state
        setMedications(DEMO_MEDICATIONS);
        setUserDbMeds([]);
        setUserAppointments([]);
        setUserCaregivers([]);
        setUserAlerts(DEMO_ALERTS);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user, loadPersistentDoses]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!user) {
      setUserAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: "acknowledged", acknowledged_at: new Date().toISOString() }
            : a
        )
      );
      showToast("Alert marked acknowledged (Demo mode).");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("alerts")
        .update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId)
        .eq("patient_id", user.id);

      if (error) throw error;
      showToast("Alert marked acknowledged.");
      await loadPersistentDoses(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to acknowledge alert.";
      console.warn(msg);
    }
  };

  // Mark Dose as Taken or Undo Taken
  const handleMarkTaken = async (id: string) => {
    const targetMed = medications.find((m) => m.id === id);
    if (!targetMed) return;

    const isCurrentlyTaken = targetMed.status === "taken";
    const newStatus = isCurrentlyTaken ? "pending" : "taken";
    const nowIso = new Date().toISOString();
    const lastTakenStr = isCurrentlyTaken
      ? undefined
      : `Today, ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

    // Optimistic state update for immediate elder feedback
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          return {
            ...med,
            status: newStatus,
            lastTaken: lastTakenStr,
          };
        }
        return med;
      })
    );

    if (!isCurrentlyTaken) {
      showToast(`✓ Marked ${targetMed.name} ${targetMed.dosage} as Taken! Great job.`);
    } else {
      showToast(`Returned ${targetMed.name} ${targetMed.dosage} to scheduled.`);
    }

    // Persist to Supabase if authenticated
    if (user && targetMed.scheduledFor) {
      try {
        const supabase = createClient();
        await supabase.from("medication_dose_logs").upsert(
          {
            medication_id: targetMed.id,
            patient_id: user.id,
            scheduled_for: targetMed.scheduledFor,
            status: newStatus,
            taken_at: isCurrentlyTaken ? null : nowIso,
            updated_at: nowIso,
          },
          { onConflict: "medication_id,scheduled_for" }
        );
      } catch (err) {
        console.warn("Error persisting dose log:", err);
      }
    }
  };

  // Snooze Dose by 10 minutes
  const handleSnooze = async (id: string) => {
    const targetMed = medications.find((m) => m.id === id);
    if (!targetMed) return;

    const snoozeMs = 10 * 60 * 1000;
    const snoozedUntilDate = new Date(Date.now() + snoozeMs);
    const snoozedUntilIso = snoozedUntilDate.toISOString();
    const nextTimeStr = snoozedUntilDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Optimistic UI update
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          return {
            ...med,
            status: "snoozed",
            snoozedUntil: `Snoozed until ${nextTimeStr}`,
          };
        }
        return med;
      })
    );

    showToast(`⏰ Snoozed ${targetMed.name}. Reminder scheduled for ${nextTimeStr}.`);

    // Persist to Supabase if authenticated
    if (user && targetMed.scheduledFor) {
      try {
        const supabase = createClient();
        await supabase.from("medication_dose_logs").upsert(
          {
            medication_id: targetMed.id,
            patient_id: user.id,
            scheduled_for: targetMed.scheduledFor,
            status: "snoozed",
            snoozed_until: snoozedUntilIso,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "medication_id,scheduled_for" }
        );
      } catch (err) {
        console.warn("Error persisting snooze:", err);
      }
    }
  };

  const handleOpenHelp = (medication: Medication) => {
    setHelpMed(medication);
  };

  // Log Need Help action
  const handleHelpRequested = async (reason: string) => {
    const contactName = activePatient.emergencyContact.name;
    const phone = activePatient.emergencyContact.phone;

    if (phone && phone !== "None configured") {
      showToast(`Assistance note recorded: "${reason}". Please call ${contactName} if urgent.`);
    } else {
      showToast(`Assistance note recorded: "${reason}". National helpline (112) is available.`);
    }

    if (user && helpMed && helpMed.scheduledFor) {
      try {
        const supabase = createClient();
        await supabase.from("medication_dose_logs").upsert(
          {
            medication_id: helpMed.id,
            patient_id: user.id,
            scheduled_for: helpMed.scheduledFor,
            status: "need_help",
            note: reason,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "medication_id,scheduled_for" }
        );

        // Update local state
        setMedications((prev) =>
          prev.map((m) => (m.id === helpMed.id ? { ...m, status: "need_help" } : m))
        );
      } catch (err) {
        console.warn("Error persisting need help note:", err);
      }
    }
  };

  const handleSimulateAlert = () => {
    showToast("🚨 Check-in alert recorded on local care circle board (Demo Mode).");
  };

  const takenCount = medications.filter((m) => m.status === "taken").length;
  const currentWeeklyPercentage = medications.length > 0
    ? Math.round((takenCount / medications.length) * 100)
    : null;

  const dynamicStats: AdherenceStats = user && userDbMeds.length === 0
    ? {
        takenToday: 0,
        totalScheduledToday: 0,
        takenThisWeek: 0,
        totalScheduledThisWeek: 0,
        currentStreakDays: 0,
        weeklyPercentage: null,
        dailyProgress: [],
      }
    : {
        ...DEMO_ADHERENCE,
        takenToday: takenCount,
        totalScheduledToday: medications.length,
        weeklyPercentage: currentWeeklyPercentage,
      };

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAF8] p-8 text-center text-[#66736B]">Loading CareCircle My Day...</div>}>
      <div className="min-h-screen bg-[#F8FAF8] pb-16">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#26352E] px-5 py-3.5 text-sm font-bold text-white shadow-2xl ring-1 ring-white/20 animate-in slide-in-from-bottom-5 duration-200 max-w-md"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Status & Quick Action Banner */}
        <div className="border-b border-[#E3EAE5] bg-[#EAF2EC]/60">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-4 py-2.5 sm:px-6 lg:px-8 text-xs font-semibold text-[#66736B]">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#477A62] animate-pulse" />
              <span className="font-bold text-[#26352E]">Daily Care Companion:</span>
              {user ? (
                <span>Personal schedule for <strong className="text-[#26352E]">{activePatient.name}</strong></span>
              ) : (
                <span>Exploring in demo mode (Smt. Shanti Devi). Sign in to personalize.</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#66736B]">
              <Link
                href="/medications"
                className="text-[#477A62] font-bold hover:underline flex items-center gap-1"
              >
                <Pill className="h-3.5 w-3.5" /> Manage Medications
              </Link>
              <span>•</span>
              {user ? (
                <Link href="/profile" className="text-[#477A62] font-bold hover:underline flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> My Profile
                </Link>
              ) : (
                <Link href="/login" className="text-[#477A62] font-bold hover:underline flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Sign In
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Patient Greeting & Assistance Header */}
          <PatientHeader
            patient={activePatient}
            onOpenEmergency={() => setEmergencyOpen(true)}
            takenCount={takenCount}
            totalCount={medications.length}
          />

          {/* Empty Medication Prescriptions State for Authenticated Users */}
          {user && !isLoadingMeds && userDbMeds.length === 0 && (
            <div className="bg-white rounded-3xl p-8 border border-[#E3EAE5] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[#EAF2EC] text-[#477A62] flex items-center justify-center shrink-0">
                  <Pill className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#26352E]">
                    You haven&apos;t added any medicines yet
                  </h2>
                  <p className="text-base text-[#66736B] mt-0.5">
                    Add your daily prescriptions to see your personal morning, afternoon, and evening routine here.
                  </p>
                </div>
              </div>
              <Link href="/medications" className="shrink-0">
                <Button className="h-12 px-6 bg-[#477A62] hover:bg-[#3B6551] text-white font-bold rounded-xl flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span>Add Medicines</span>
                </Button>
              </Link>
            </div>
          )}

          {/* Active Smart Alerts Bar */}
          <AlertsWidget
            alerts={user ? userAlerts : DEMO_ALERTS}
            onAcknowledge={handleAcknowledgeAlert}
          />

          {/* Senior Primary Experience: 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8 Cols: Today's Medication Schedule */}
            <div className="lg:col-span-8 space-y-6">
              <MedicationTimeline
                medications={medications}
                onMarkTaken={handleMarkTaken}
                onSnooze={handleSnooze}
                onOpenHelp={handleOpenHelp}
              />
            </div>

            {/* Right 4 Cols: Consistency, Appointments & Family Circle */}
            <div className="lg:col-span-4 space-y-6">
              <AdherenceWidget stats={dynamicStats} />
              <AppointmentsWidget appointments={user ? userAppointments : DEMO_APPOINTMENTS} />
              <CareCircleWidget caregivers={user ? userCaregivers : DEMO_CAREGIVERS} />
            </div>
          </div>
        </div>

        {/* Overlays & Dialogs */}
        <EmergencyModal
          isOpen={emergencyOpen}
          onClose={() => setEmergencyOpen(false)}
          onSimulateAlert={handleSimulateAlert}
          patient={activePatient}
        />

        <HelpModal
          medication={helpMed}
          isOpen={Boolean(helpMed)}
          onClose={() => setHelpMed(null)}
          onHelpRequested={handleHelpRequested}
          patient={activePatient}
        />
      </div>
    </Suspense>
  );
}