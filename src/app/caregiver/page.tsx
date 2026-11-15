"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  PhoneCall,
  Send,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEMO_PATIENT,
  DEMO_MEDICATIONS,
  DEMO_APPOINTMENTS,
  DEMO_ADHERENCE,
} from "@/lib/demo-data";

export default function CaregiverPortalPage() {
  const [nudgeSent, setNudgeSent] = useState(false);
  const [nudgeToast, setNudgeToast] = useState(false);

  const takenMeds = DEMO_MEDICATIONS.filter((m) => m.status === "taken");
  const pendingMeds = DEMO_MEDICATIONS.filter((m) => m.status !== "taken");

  const handleSendNudge = () => {
    setNudgeSent(true);
    setNudgeToast(true);
    setTimeout(() => setNudgeToast(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 dark:bg-slate-950">
      {/* Toast Notification */}
      {nudgeToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl ring-1 ring-white/20 animate-in slide-in-from-bottom-5 duration-200 dark:bg-white dark:text-slate-900">
          <CheckCircle2 className="h-5 w-5 text-teal-400 dark:text-teal-600" />
          <span>Warm reminder notification scheduled for {DEMO_PATIENT.name}&apos;s tablet!</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Elderly &ldquo;My Day&rdquo; Experience
          </Link>
          <Badge variant="secondary">Supporting Family Portal (Phase 1 Demo)</Badge>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        {/* Caregiver Status Banner */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-teal-50 p-6 shadow-sm dark:border-teal-900 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Supporting Family Circle
                </Badge>
                <span className="text-xs text-slate-500">Demonstration Overview</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Supporting {DEMO_PATIENT.name} (Age {DEMO_PATIENT.age})
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Primary Contact: {DEMO_PATIENT.emergencyContact.name} ({DEMO_PATIENT.emergencyContact.relationship}) • {DEMO_PATIENT.emergencyContact.phone}
              </p>
              <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium pt-1">
                Notice: This view displays simulated sample data. Live caregiver synchronization, invite codes, and permissions are scheduled for Phase 4.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={handleSendNudge}
                disabled={nudgeSent}
                className="gap-2 font-bold min-h-[44px]"
              >
                <Send className="h-4 w-4 text-teal-600" />
                {nudgeSent ? "Gentle Nudge Sent ✓" : "Send Warm Reminder"}
              </Button>
              <a
                href={`tel:${DEMO_PATIENT.phone}`}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-teal-700 min-h-[44px]"
              >
                <PhoneCall className="h-4 w-4" />
                Call Mother
              </a>
            </div>
          </div>
        </div>

        {/* Adherence & Pending Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-2xl">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-bold">Today&apos;s Routine Status</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-teal-600">
                  {Math.round((takenMeds.length / DEMO_MEDICATIONS.length) * 100)}%
                </span>
                <span className="text-xs text-slate-500">
                  ({takenMeds.length} of {DEMO_MEDICATIONS.length} doses confirmed)
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Weekly Consistency</span>
                  <span className="text-slate-900 dark:text-white font-bold">{DEMO_ADHERENCE.weeklyPercentage}%</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Current Routine Streak</span>
                  <span className="text-amber-600 font-bold">{DEMO_ADHERENCE.currentStreakDays} days</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl md:col-span-2">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Remaining Doses for Today ({pendingMeds.length})
                </CardTitle>
                <Badge variant="warning">{pendingMeds.length} Due</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="space-y-2">
                {pendingMeds.map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-white dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {med.name} {med.dosage}
                      </div>
                      <div className="text-xs text-slate-500">
                        Scheduled for {med.timeLabel} • {med.instructions}
                      </div>
                    </div>
                    <Badge variant="secondary">{med.timeSlot}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Doctor Visits */}
        <Card className="rounded-2xl">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              Upcoming Doctor Visits to Accompany Shanti Devi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_APPOINTMENTS.map((apt) => (
                <div
                  key={apt.id}
                  className="rounded-xl border border-slate-200 p-3.5 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {apt.doctorName} ({apt.specialty})
                  </div>
                  <div className="text-xs text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                    {apt.date} at {apt.time}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{apt.location}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
