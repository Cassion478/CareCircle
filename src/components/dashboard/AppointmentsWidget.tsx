import { Calendar, Clock, MapPin, Phone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Appointment } from "@/types";

interface AppointmentsWidgetProps {
  appointments: Appointment[];
}

export function AppointmentsWidget({ appointments }: AppointmentsWidgetProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            Doctor Appointments
          </CardTitle>
          <Badge variant="secondary">{appointments.length} Upcoming</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-2 space-y-3">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {apt.doctorName}
                  </span>
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                    {apt.specialty}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <span className="flex items-center gap-1 font-semibold text-teal-800 dark:text-teal-300">
                    <Clock className="h-3.5 w-3.5" />
                    {apt.date} at {apt.time}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {apt.location}
                  </span>
                </div>

                {apt.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-1">
                    &ldquo;{apt.notes}&rdquo;
                  </p>
                )}
              </div>

              {apt.phone && (
                <a
                  href={`tel:${apt.phone}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white transition-colors"
                  title="Call Clinic"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400 dark:border-slate-800">
          Full Appointment Management & Scheduling coming in Phase 4
        </div>
      </CardContent>
    </Card>
  );
}
