"use client";

import { useState, useEffect, useRef } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { DbMedication, Appointment } from "@/types";
import { mapDbToUiAppointment } from "@/lib/appointments";
import { formatTimeLabel } from "@/lib/medications";

export default function CaregiverPortalPage() {
  const { user, profile } = useAuth();
  const [nudgeSent, setNudgeSent] = useState(false);
  const [nudgeToast, setNudgeToast] = useState(false);
  const [medications, setMedications] = useState<DbMedication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const nudgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const patientName = profile?.fullName || user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : "Patient");
  const patientPhone = profile?.phoneNumber || user?.user_metadata?.phone_number || profile?.emergencyContactPhone || "";
  const emergencyContactName = profile?.emergencyContactName || user?.user_metadata?.emergency_contact_name || "Family Member";

  useEffect(() => {
    let isCancelled = false;

    async function loadCaregiverView(userId: string) {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const [{ data: meds }, { data: apts }] = await Promise.all([
          supabase.from("medications").select("*").eq("patient_id", userId).eq("is_active", true),
          supabase.from("appointments").select("*").eq("patient_id", userId).order("appointment_date", { ascending: true }),
        ]);

        if (!isCancelled) {
          setMedications(meds || []);
          setAppointments((apts || []).map(mapDbToUiAppointment));
        }
      } catch (err) {
        console.warn("Could not load caregiver view:", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      void loadCaregiverView(user.id);
    }

    return () => {
      isCancelled = true;
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, [user]);

  const handleSendNudge = () => {
    setNudgeSent(true);
    setNudgeToast(true);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => setNudgeToast(false), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-16">
      {/* Toast Notification */}
      {nudgeToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#26352E] px-5 py-3.5 text-sm font-bold text-white shadow-2xl ring-1 ring-white/20 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>Warm reminder notification scheduled for {patientName}&apos;s device!</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="border-b border-[#E3EAE5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/my-day"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#66736B] hover:text-[#26352E]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Elderly &ldquo;My Day&rdquo; Routine
          </Link>
          <Badge variant="secondary">Family Caregiver Portal</Badge>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        {/* Caregiver Status Banner */}
        <div className="rounded-2xl border border-[#C8D9CD] bg-linear-to-r from-[#EAF2EC] via-white to-[#EAF2EC] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-[#477A62]" /> Supporting Family Circle
                </Badge>
                <span className="text-xs text-[#66736B]">Authenticated Family Oversight</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#26352E]">
                Supporting {patientName}
              </h1>
              <p className="text-xs sm:text-sm text-[#66736B]">
                Primary Contact: {emergencyContactName} {patientPhone ? `• ${patientPhone}` : ""}
              </p>
              <p className="text-xs text-[#477A62] font-medium pt-1">
                Family Portal provides real-time visibility into medication regimens, clinic visits, and check-in assistance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={handleSendNudge}
                disabled={nudgeSent}
                className="gap-2 font-bold min-h-[44px] border-[#D9E2DC] text-[#26352E] hover:bg-[#EAF2EC] cursor-pointer"
              >
                <Send className="h-4 w-4 text-[#477A62]" />
                {nudgeSent ? "Gentle Nudge Sent ✓" : "Send Warm Reminder"}
              </Button>
              {patientPhone && (
                <a
                  href={`tel:${patientPhone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#477A62] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#3B6551] min-h-[44px]"
                >
                  <PhoneCall className="h-4 w-4" />
                  Call Patient
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 text-center space-y-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#477A62] border-t-transparent mx-auto" />
            <p className="text-xs font-semibold text-[#66736B]">Loading family oversight records...</p>
          </div>
        )}

        {/* Overview Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-2xl">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-base font-bold">Active Prescriptions</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-2 space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-[#477A62]">
                    {medications.length}
                  </span>
                  <span className="text-xs text-[#66736B]">
                    medications actively tracked
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E3EAE5]">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#66736B]">Upcoming Visits</span>
                    <span className="text-[#26352E] font-bold">{appointments.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl md:col-span-2">
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#477A62]" />
                    Current Prescriptions ({medications.length})
                  </CardTitle>
                  <Badge variant="secondary">{medications.length} Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-2">
                {medications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#66736B]">
                    No active prescriptions recorded yet for {patientName}.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {medications.map((med) => (
                      <div
                        key={med.id}
                        className="flex items-center justify-between rounded-xl border border-[#E3EAE5] p-3 bg-white"
                      >
                        <div>
                          <div className="font-bold text-sm text-[#26352E]">
                            {med.name} {med.dosage}
                          </div>
                          <div className="text-xs text-[#66736B]">
                            {med.scheduled_times.map(formatTimeLabel).join(", ")} • {med.instructions}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {med.scheduled_times.length > 1 ? `${med.scheduled_times.length}x daily` : "Once daily"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Doctor Visits */}
        {!isLoading && (
          <Card className="rounded-2xl">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#477A62]" />
                Upcoming Doctor Visits for {patientName}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              {appointments.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#66736B]">
                  No upcoming doctor visits scheduled.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="rounded-xl border border-[#E3EAE5] p-3.5 bg-white"
                    >
                      <div className="font-bold text-sm text-[#26352E]">
                        {apt.doctorName} {apt.specialty ? `(${apt.specialty})` : ""}
                      </div>
                      <div className="text-xs text-[#477A62] font-semibold mt-0.5">
                        {apt.date} at {apt.time}
                      </div>
                      {apt.location && <div className="text-xs text-[#66736B] mt-0.5">{apt.location}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
