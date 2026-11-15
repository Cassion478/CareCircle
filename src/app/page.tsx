"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, User, Sparkles, Pill, Plus } from "lucide-react";
import { PatientHeader } from "@/components/dashboard/PatientHeader";
import { MedicationTimeline } from "@/components/dashboard/MedicationTimeline";
import { AppointmentsWidget } from "@/components/dashboard/AppointmentsWidget";
import { AdherenceWidget } from "@/components/dashboard/AdherenceWidget";
import { CareCircleWidget } from "@/components/dashboard/CareCircleWidget";
import { EmergencyModal } from "@/components/dashboard/EmergencyModal";
import { HelpModal } from "@/components/dashboard/HelpModal";
import {
  DEMO_PATIENT,
  DEMO_MEDICATIONS,
  DEMO_APPOINTMENTS,
  DEMO_CAREGIVERS,
  DEMO_ADHERENCE,
} from "@/lib/demo-data";
import { Medication, AdherenceStats, UserProfile, DbMedication, Appointment, Caregiver } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { buildTodaySchedule } from "@/lib/medications";
import { mapDbToUiAppointment } from "@/lib/appointments";
import { getAvatarInitials } from "@/lib/care-circle";

export default function MyDayDashboard() {
  const { user, profile } = useAuth();
  const [medications, setMedications] = useState<Medication[]>(DEMO_MEDICATIONS);
  const [userDbMeds, setUserDbMeds] = useState<DbMedication[]>([]);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [helpMed, setHelpMed] = useState<Medication | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingMeds, setIsLoadingMeds] = useState(false);
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
  const [userCaregivers, setUserCaregivers] = useState<Caregiver[]>([]);

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
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user, loadPersistentDoses]);

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

    // Phase 3 requirement: Snooze defers reminder by 10 minutes
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
    : 100;

  const dynamicStats: AdherenceStats = {
    ...DEMO_ADHERENCE,
    takenToday: takenCount,
    totalScheduledToday: medications.length,
    weeklyPercentage: currentWeeklyPercentage,
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 p-8 text-center text-slate-500">Loading CareCircle My Day...</div>}>
      <div className="min-h-screen bg-slate-50/70 pb-16 dark:bg-slate-950">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl ring-1 ring-white/20 animate-in slide-in-from-bottom-5 duration-200 dark:bg-white dark:text-slate-900 max-w-md"
          >
            <CheckCircle2 className="h-5 w-5 text-teal-400 dark:text-teal-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Phase 3 Context Banner */}
        <div className="border-b border-slate-200 bg-teal-50/60 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-4 py-2.5 sm:px-6 lg:px-8 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-teal-800 dark:text-teal-400">Phase 3:</span>
              {user ? (
                <span>Signed in as <strong className="text-slate-900 dark:text-white">{activePatient.name}</strong>. Daily doses are synced to your database.</span>
              ) : (
                <span>Exploring in demo mode. Add or track real prescriptions by signing in.</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <Link
                href="/medications"
                className="text-teal-700 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
              >
                <Pill className="h-3.5 w-3.5" /> Manage Medications
              </Link>
              <span>•</span>
              {user ? (
                <Link href="/profile" className="text-teal-700 dark:text-teal-400 font-bold hover:underline flex items-center gap-1">
                  <User className="h-3 w-3" /> Profile
                </Link>
              ) : (
                <Link href="/login" className="text-teal-700 dark:text-teal-400 font-bold hover:underline flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Sign In
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
                  <Pill className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    You haven&apos;t added any medicines yet
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Add your daily prescriptions to see your personal morning, afternoon, and evening routine here.
                  </p>
                </div>
              </div>
              <Link href="/medications" className="shrink-0">
                <Button className="h-12 px-6 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Medicines</span>
                </Button>
              </Link>
            </div>
          )}

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
