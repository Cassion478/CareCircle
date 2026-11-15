"use client";

import { useState, Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
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
import { Medication, AdherenceStats } from "@/types";

export default function MyDayDashboard() {
  const [medications, setMedications] = useState<Medication[]>(DEMO_MEDICATIONS);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [helpMed, setHelpMed] = useState<Medication | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleMarkTaken = (id: string) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          const isCurrentlyTaken = med.status === "taken";
          const newStatus = isCurrentlyTaken ? "pending" : "taken";
          const lastTaken = isCurrentlyTaken
            ? undefined
            : `Today, ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

          if (!isCurrentlyTaken) {
            showToast(`✓ Marked ${med.name} ${med.dosage} as Taken! Great job.`);
          } else {
            showToast(`Returned ${med.name} ${med.dosage} to scheduled.`);
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
          const nextTime = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          });
          showToast(`⏰ Snoozed ${med.name}. Reminder scheduled locally for ${nextTime}.`);
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
    showToast(`Assistance note recorded locally: "${reason}". Call Pooja if urgent.`);
  };

  const handleSimulateAlert = () => {
    showToast("🚨 Check-in alert recorded on local care circle board (Demo Mode).");
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

        {/* Demo Mode Notice */}
        <div className="border-b border-slate-200 bg-teal-50/60 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-4 py-2.5 sm:px-6 lg:px-8 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-teal-800 dark:text-teal-400">Phase 1 Demo Experience:</span>
              <span>Confirmations and snooze states are stored in local session memory and will reset upon page refresh.</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Demo Patient: {DEMO_PATIENT.name} • Persistent database storage arrives in Phase 3
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
          {/* Patient Greeting & Assistance Header */}
          <PatientHeader
            patient={DEMO_PATIENT}
            onOpenEmergency={() => setEmergencyOpen(true)}
            takenCount={takenCount}
            totalCount={medications.length}
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
              <AppointmentsWidget appointments={DEMO_APPOINTMENTS} />
              <CareCircleWidget caregivers={DEMO_CAREGIVERS} />
            </div>
          </div>
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
