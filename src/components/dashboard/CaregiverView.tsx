import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  PhoneCall,
  Send,
  Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserProfile, Medication, Appointment, AdherenceStats } from "@/types";

interface CaregiverViewProps {
  patient: UserProfile;
  medications: Medication[];
  appointments: Appointment[];
  stats: AdherenceStats;
  onSendNudge: () => void;
  nudgeSent: boolean;
}

export function CaregiverView({
  patient,
  medications,
  appointments,
  stats,
  onSendNudge,
  nudgeSent,
}: CaregiverViewProps) {
  const takenMeds = medications.filter((m) => m.status === "taken");
  const pendingMeds = medications.filter((m) => m.status !== "taken");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Caregiver Status Banner */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-teal-50 p-6 shadow-sm dark:border-teal-900 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-bold">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Caregiver Guardian Mode
              </Badge>
              <span className="text-xs text-slate-500">Live Monitoring</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Monitoring {patient.name} (Age {patient.age})
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Primary Contact: {patient.emergencyContact.name} ({patient.emergencyContact.relationship}) • {patient.emergencyContact.phone}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={onSendNudge}
              disabled={nudgeSent}
              className="gap-2 font-semibold"
            >
              <Send className="h-4 w-4 text-teal-600" />
              {nudgeSent ? "Gentle Nudge Sent ✓" : "Send Gentle Reminder"}
            </Button>
            <a
              href={`tel:${patient.phone}`}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-700"
            >
              <PhoneCall className="h-4 w-4" />
              Call Eleanor
            </a>
          </div>
        </div>
      </div>

      {/* Grid: Live Adherence Status & Doses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Adherence Summary */}
        <Card className="rounded-2xl">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold">Today&apos;s Adherence</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-teal-600">
                {Math.round((takenMeds.length / medications.length) * 100)}%
              </span>
              <span className="text-xs text-slate-500">
                ({takenMeds.length} of {medications.length} doses confirmed)
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">Weekly Consistency</span>
                <span className="text-slate-900 dark:text-white font-bold">{stats.weeklyPercentage}%</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500">Current Streak</span>
                <span className="text-amber-600 font-bold">{stats.currentStreakDays} days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Due Next Dose */}
        <Card className="rounded-2xl md:col-span-2">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Remaining Doses Today ({pendingMeds.length})
              </CardTitle>
              <Badge variant="warning">{pendingMeds.length} Pending</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {pendingMeds.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold flex items-center gap-2 dark:bg-emerald-950 dark:text-emerald-200">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                All medications for today have been confirmed! Great job Eleanor.
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments Summary for Caregiver */}
      {appointments.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              Upcoming Doctor Visits to Escort Eleanor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="rounded-xl border border-slate-200 p-3 bg-white dark:border-slate-800 dark:bg-slate-900"
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
      )}

      {/* Confirmed History Log */}
      <Card className="rounded-2xl">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Confirmed Medication Log for Today
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          {takenMeds.length === 0 ? (
            <p className="text-xs text-slate-500 p-4">No doses taken yet today.</p>
          ) : (
            <div className="space-y-2">
              {takenMeds.map((med) => (
                <div
                  key={med.id}
                  className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs dark:border-emerald-950 dark:bg-emerald-950/20"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {med.name} {med.dosage}
                      </span>
                      <span className="text-slate-500 ml-2">({med.timeLabel})</span>
                    </div>
                  </div>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {med.lastTaken || "Confirmed Taken"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
