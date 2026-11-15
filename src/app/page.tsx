"use client";

import { useState, Suspense } from "react";
import {
  SunMedium,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { PatientHeader } from "@/components/dashboard/PatientHeader";
import { MedicationTimeline } from "@/components/dashboard/MedicationTimeline";
import { AppointmentsWidget } from "@/components/dashboard/AppointmentsWidget";
import { AdherenceWidget } from "@/components/dashboard/AdherenceWidget";
import { CareCircleWidget } from "@/components/dashboard/CareCircleWidget";
import { CaregiverView } from "@/components/dashboard/CaregiverView";
import { EmergencyModal } from "@/components/dashboard/EmergencyModal";
import { HelpModal } from "@/components/dashboard/HelpModal";
import {
  DEMO_PATIENT,
  DEMO_MEDICATIONS,
  DEMO_APPOINTMENTS,
  DEMO_CAREGIVERS,
  DEMO_ADHERENCE,
} from "@/lib/demo-data";
import { Medication, AdherenceStats } from "@/types";

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<"senior" | "caregiver">("senior");
  const [medications, setMedications] = useState<Medication[]>(DEMO_MEDICATIONS);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [helpMed, setHelpMed] = useState<Medication | null>(null);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleMarkTaken = (id: string) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          const isCurrentlyTaken = med.status === "taken";
          const newStatus = isCurrentlyTaken ? "pending" : "taken";
          const lastTaken = isCurrentlyTaken
            ? undefined
            : `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

          if (!isCurrentlyTaken) {
            showToast(`✓ Marked ${med.name} ${med.dosage} as Taken! Great job.`);
          }
          return {
            ...med,
            status: newStatus,
            lastTaken,
          };
        }
        return med;
      })
    );
  };

  const handleSnooze = (id: string) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          showToast(`⏰ Snoozed ${med.name} for 15 minutes. Reminder will chime.`);
          return { ...med, status: "snoozed" };
        }
        return med;
      })
    );
  };

  const handleOpenHelp = (medication: Medication) => {
    setHelpMed(medication);
  };

  const handleHelpRequested = (reason: string) => {
    showToast(`Help request dispatched to Sarah Jenkins: "${reason}"`);
  };

  const handleSimulateAlert = () => {
    showToast("🚨 Care alert broadcasted to all 3 members of your Care Circle!");
  };

  const handleSendNudge = () => {
    setNudgeSent(true);
    showToast("💌 Sent a warm medication reminder to Eleanor's tablet!");
    setTimeout(() => setNudgeSent(false), 5000);
  };

  const takenCount = medications.filter((m) => m.status === "taken").length;
  const currentWeeklyPercentage = Math.round(
    ((DEMO_ADHERENCE.takenThisWeek + (takenCount - 2)) / DEMO_ADHERENCE.totalScheduledThisWeek) * 100
  );

  const dynamicStats: AdherenceStats = {
    ...DEMO_ADHERENCE,
    weeklyPercentage: Math.min(100, Math.max(0, currentWeeklyPercentage)),
    takenThisWeek: DEMO_ADHERENCE.takenThisWeek + (takenCount - 2),
  };

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 p-8 text-center text-slate-500">Loading CareCircle...</div>}>
      <div className="min-h-screen bg-slate-50/70 pb-16 dark:bg-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl ring-1 ring-white/20 animate-in slide-in-from-bottom-5 duration-200 dark:bg-white dark:text-slate-900">
          <CheckCircle2 className="h-5 w-5 text-teal-400 dark:text-teal-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Demo Mode & View Switcher Bar */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-teal-700 dark:text-teal-400">Interactive Demo:</span>
            <span>Click &ldquo;Taken&rdquo; or &ldquo;Snooze&rdquo; to test real-time adherence updates</span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setViewMode("senior")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === "senior"
                  ? "bg-white text-teal-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <SunMedium className="h-4 w-4 text-amber-500" />
              Senior View (My Day)
            </button>
            <button
              onClick={() => setViewMode("caregiver")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === "caregiver"
                  ? "bg-white text-teal-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              Caregiver Guardian Mode
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        {/* Patient Greeting & Emergency SOS Header */}
        <PatientHeader
          patient={DEMO_PATIENT}
          onOpenEmergency={() => setEmergencyOpen(true)}
          takenCount={takenCount}
          totalCount={medications.length}
        />

        {/* View Mode Switching */}
        {viewMode === "caregiver" ? (
          <CaregiverView
            patient={DEMO_PATIENT}
            medications={medications}
            appointments={DEMO_APPOINTMENTS}
            stats={dynamicStats}
            onSendNudge={handleSendNudge}
            nudgeSent={nudgeSent}
          />
        ) : (
          /* Senior View: 2-Column Responsive Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8 Cols: Today's Medication Routine */}
            <div className="lg:col-span-8 space-y-6">
              <MedicationTimeline
                medications={medications}
                onMarkTaken={handleMarkTaken}
                onSnooze={handleSnooze}
                onOpenHelp={handleOpenHelp}
              />
            </div>

            {/* Right 4 Cols: Adherence, Appointments & Care Circle */}
            <div className="lg:col-span-4 space-y-6">
              <AdherenceWidget stats={dynamicStats} />
              <AppointmentsWidget appointments={DEMO_APPOINTMENTS} />
              <CareCircleWidget caregivers={DEMO_CAREGIVERS} />
            </div>
          </div>
        )}
      </div>

      {/* Overlays & Dialogs */}
      <EmergencyModal
        isOpen={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        onSimulateAlert={handleSimulateAlert}
      />

      <HelpModal
        medication={helpMed}
        isOpen={Boolean(helpMed)}
        onClose={() => setHelpMed(null)}
        onHelpRequested={handleHelpRequested}
      />
    </div>
  </Suspense>
  );
}
