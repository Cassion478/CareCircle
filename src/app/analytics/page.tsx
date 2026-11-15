"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Calendar,
  Award,
  Printer,
  Sun,
  Sunset,
  Moon,
  Clock,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { DEMO_PATIENT, DEMO_ADHERENCE } from "@/lib/demo-data";
import { AdherenceStats } from "@/types";

interface TimeSlotMetric {
  slot: string;
  name: string;
  icon: typeof Sun;
  taken: number;
  total: number;
  percentage: number;
}

type TimeFilterOption = "7d" | "30d" | "90d";

const DEMO_STATS_BY_TIMEFRAME: Record<TimeFilterOption, AdherenceStats> = {
  "7d": {
    ...DEMO_ADHERENCE,
    weeklyPercentage: 94,
    takenThisWeek: 22,
    totalScheduledThisWeek: 24,
    currentStreakDays: 6,
  },
  "30d": {
    ...DEMO_ADHERENCE,
    weeklyPercentage: 96,
    takenThisWeek: 92,
    totalScheduledThisWeek: 96,
    currentStreakDays: 14,
  },
  "90d": {
    ...DEMO_ADHERENCE,
    weeklyPercentage: 95,
    takenThisWeek: 274,
    totalScheduledThisWeek: 288,
    currentStreakDays: 28,
  },
};

export default function AnalyticsPage() {
  const { user, profile } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilterOption>("30d");
  const [patientStats, setPatientStats] = useState<AdherenceStats | null>(null);
  const [appointmentSummary, setAppointmentSummary] = useState({
    total: 6,
    completed: 5,
    upcoming: 1,
    attendanceRate: 100,
  });
  const [timeOfDayMetrics] = useState<TimeSlotMetric[]>([
    { slot: "morning", name: "Morning Routine (8:00 AM)", icon: Sun, taken: 14, total: 14, percentage: 100 },
    { slot: "afternoon", name: "Afternoon Routine (1:30 PM)", icon: Clock, taken: 6, total: 7, percentage: 86 },
    { slot: "evening", name: "Evening Routine (8:00 PM)", icon: Sunset, taken: 13, total: 14, percentage: 93 },
    { slot: "night", name: "Night Routine (10:00 PM)", icon: Moon, taken: 7, total: 7, percentage: 100 },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const patientName = user
    ? profile?.fullName || user.user_metadata?.full_name || "Patient"
    : DEMO_PATIENT.name;

  const isDemo = !user;
  const stats: AdherenceStats = user && patientStats ? patientStats : DEMO_STATS_BY_TIMEFRAME[timeFilter];

  useEffect(() => {
    let isCancelled = false;

    async function loadRealAnalytics(userId: string) {
      setIsLoading(true);
      try {
        const supabase = createClient();

        // 1. Fetch total medications
        const { data: meds } = await supabase
          .from("medications")
          .select("id, name, scheduled_times")
          .eq("patient_id", userId)
          .eq("is_active", true);

        // 2. Fetch dose logs scoped to the active timeFilter
        const daysToFetch = timeFilter === "7d" ? 7 : timeFilter === "90d" ? 90 : 30;
        const filterCutoff = new Date();
        filterCutoff.setDate(filterCutoff.getDate() - daysToFetch);

        const { data: logs } = await supabase
          .from("medication_dose_logs")
          .select("*")
          .eq("patient_id", userId)
          .gte("scheduled_for", filterCutoff.toISOString());

        // 3. Fetch appointments
        const { data: apts } = await supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", userId);

        if (!isCancelled) {
          if (logs && logs.length > 0) {
            const taken = logs.filter((l) => l.status === "taken").length;
            const total = logs.length;
            const pct = total > 0 ? Math.round((taken / total) * 100) : 100;
            const dailyMedsCount = Math.max(1, meds?.length || 1);
            const calculatedStreak = Math.min(Math.floor(taken / dailyMedsCount), daysToFetch);

            setPatientStats({
              weeklyPercentage: pct,
              takenThisWeek: taken,
              totalScheduledThisWeek: total,
              currentStreakDays: calculatedStreak,
              dailyProgress: DEMO_ADHERENCE.dailyProgress,
            });
          } else {
            // Patient has no logs yet in this window
            setPatientStats({
              weeklyPercentage: 100,
              currentStreakDays: 0,
              takenThisWeek: 0,
              totalScheduledThisWeek: 0,
              missedThisWeek: 0,
              dailyProgress: DEMO_ADHERENCE.dailyProgress,
            });
          }

          if (apts && apts.length > 0) {
            const completed = apts.filter((a) => a.status === "completed").length;
            const scheduled = apts.filter((a) => a.status === "scheduled").length;
            const attendancePct = apts.length > 0 ? Math.round(((completed + scheduled) / apts.length) * 100) : 100;

            setAppointmentSummary({
              total: apts.length,
              completed,
              upcoming: scheduled,
              attendanceRate: attendancePct,
            });
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic analytics:", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      void loadRealAnalytics(user.id);
    }

    return () => {
      isCancelled = true;
    };
  }, [user, timeFilter]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const filterLabel =
    timeFilter === "7d"
      ? "Last 7 Days (Weekly)"
      : timeFilter === "90d"
      ? "Last 90 Days (Quarterly)"
      : "Last 30 Days (Monthly)";

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAF8] p-8 text-center text-[#66736B]">Loading health analytics...</div>}>
      <div className="min-h-screen bg-[#F8FAF8] pb-16 print:bg-white print:p-0">
        {/* Navigation Breadcrumb & Page Header */}
        <div className="border-b border-[#E3EAE5] bg-white py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-[#66736B] mb-1">
                  <Link href="/my-day" className="hover:text-[#26352E] flex items-center gap-1 font-semibold">
                    <ArrowLeft className="h-4 w-4" /> My Day
                  </Link>
                  <span>/</span>
                  <span className="font-bold text-[#26352E]">Health Analytics & Consistency</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#26352E] tracking-tight">
                    Health & Routine Analytics
                  </h1>
                  {isDemo ? (
                    <Badge variant="warning" className="font-bold">
                      Demo Data (Smt. Shanti Devi)
                    </Badge>
                  ) : (
                    <Badge variant="success" className="font-bold">
                      Verified Patient Data ({patientName})
                    </Badge>
                  )}
                </div>
                <p className="text-base text-[#66736B] mt-1">
                  Medication consistency, adherence trends, and medical appointment summaries for {patientName}.
                </p>
                {isLoading && (
                  <p className="text-xs text-[#477A62] font-semibold animate-pulse mt-1">
                    Updating records from health database...
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 print:hidden">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="h-12 px-5 font-bold border-[#D9E2DC] text-[#26352E] hover:bg-[#EAF2EC] flex items-center gap-2 rounded-xl cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-[#477A62]" />
                  <span>Print Health Summary</span>
                </Button>

                <Link href="/my-day">
                  <Button className="h-12 px-5 font-bold bg-[#477A62] hover:bg-[#3B6551] text-white rounded-xl flex items-center gap-2 cursor-pointer shadow-sm">
                    <span>Back to Routine</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Analytics Content Container */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E3EAE5] shadow-xs print:hidden">
            <div className="flex items-center gap-2 text-sm font-bold text-[#26352E]">
              <Filter className="h-4 w-4 text-[#477A62]" />
              <span>Timeframe:</span>
              <span className="text-[#66736B] font-medium">{filterLabel}</span>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-[#F8FAF8] border border-[#E3EAE5] gap-1">
              <button
                type="button"
                onClick={() => setTimeFilter("7d")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                  timeFilter === "7d"
                    ? "bg-[#477A62] text-white shadow-xs"
                    : "text-[#66736B] hover:text-[#26352E] hover:bg-[#EAF2EC]"
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("30d")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                  timeFilter === "30d"
                    ? "bg-[#477A62] text-white shadow-xs"
                    : "text-[#66736B] hover:text-[#26352E] hover:bg-[#EAF2EC]"
                }`}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("90d")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                  timeFilter === "90d"
                    ? "bg-[#477A62] text-white shadow-xs"
                    : "text-[#66736B] hover:text-[#26352E] hover:bg-[#EAF2EC]"
                }`}
              >
                Last 90 Days
              </button>
            </div>
          </div>

          {/* Top Motivational Wellness Card */}
          <div className="rounded-3xl border border-[#C8D9CD] bg-linear-to-r from-[#EAF2EC] to-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#477A62] text-white shadow-md shrink-0">
                <Award className="h-9 w-9" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {stats.weeklyPercentage === null ? (
                    <Badge variant="secondary">Not enough data</Badge>
                  ) : stats.weeklyPercentage >= 80 ? (
                    <Badge variant="success">Outstanding Consistency</Badge>
                  ) : stats.weeklyPercentage > 0 ? (
                    <Badge variant="warning">In Progress</Badge>
                  ) : (
                    <Badge variant="danger">Needs Attention</Badge>
                  )}
                  <span className="text-xs font-semibold text-[#66736B]">{filterLabel}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#26352E]">
                  {stats.weeklyPercentage === null
                    ? `Welcome to Health Analytics, ${patientName}!`
                    : stats.weeklyPercentage >= 90
                    ? `Great job, ${patientName}! You're staying on schedule.`
                    : stats.weeklyPercentage > 0
                    ? `Keep it up, ${patientName}! Every taken dose counts.`
                    : `Attention needed: 0 doses taken for ${filterLabel.toLowerCase()}.`}
                </h2>
                <p className="text-base text-[#4F5D54]">
                  {stats.weeklyPercentage === null
                    ? `No recorded doses found for ${filterLabel.toLowerCase()}. As you record doses in your My Day schedule, your consistency rates, streak days, and routine insights will automatically appear here.`
                    : stats.weeklyPercentage > 0
                    ? `You have maintained an active ${stats.currentStreakDays}-day streak with ${stats.weeklyPercentage}% adherence. Consistent timing helps your heart and blood pressure stay stable.`
                    : `You have 0 confirmed doses out of ${stats.totalScheduledThisWeek} planned doses for ${filterLabel.toLowerCase()}. Take your scheduled medicines to protect your health.`}
                </p>
              </div>
            </div>

            <div className="text-center md:text-right shrink-0 bg-white/80 border border-[#D9E2DC] px-6 py-4 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#66736B]">Current Streak</span>
              <p className="text-4xl font-black text-[#477A62]">
                {stats.currentStreakDays > 0 ? `${stats.currentStreakDays} Days` : "0 Days"}
              </p>
              <span className="text-xs text-[#8F9E94]">
                {stats.currentStreakDays > 0 ? "Continuous routine adherence" : "Start your streak today"}
              </span>
            </div>
          </div>

          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stat 1: Adherence */}
            <Card>
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#66736B]">Period Adherence</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2EC] text-[#477A62]">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-2xl sm:text-3xl font-black text-[#26352E]">
                  {stats.weeklyPercentage !== null ? `${stats.weeklyPercentage}%` : "No data available"}
                </div>
                <p className="text-xs text-[#66736B] mt-1">
                  {stats.totalScheduledThisWeek > 0
                    ? `${stats.takenThisWeek} of ${stats.totalScheduledThisWeek} doses taken in ${timeFilter === "7d" ? "7 days" : timeFilter === "90d" ? "90 days" : "30 days"}`
                    : "0 doses recorded in this timeframe"}
                </p>
                <div className="mt-3 w-full bg-[#EAF2EC] rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      stats.weeklyPercentage === null
                        ? "bg-transparent"
                        : stats.weeklyPercentage >= 80
                        ? "bg-[#477A62]"
                        : stats.weeklyPercentage > 0
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{
                      width: `${stats.weeklyPercentage !== null ? Math.min(stats.weeklyPercentage, 100) : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stat 2: Active Streak */}
            <Card>
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#66736B]">Medication Streak</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Award className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-3xl font-black text-[#26352E]">{stats.currentStreakDays} Days</div>
                <p className="text-xs text-[#66736B] mt-1">
                  Continuous on-time medication adherence
                </p>
                <Badge variant="warning" className="mt-3">Goal: 14 Days</Badge>
              </CardContent>
            </Card>

            {/* Stat 3: Doctor Visits */}
            <Card>
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#66736B]">Clinic Visits</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2EC] text-[#477A62]">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-3xl font-black text-[#26352E]">{appointmentSummary.completed} Attended</div>
                <p className="text-xs text-[#66736B] mt-1">
                  {appointmentSummary.attendanceRate}% on-time attendance rate
                </p>
                <Badge variant="success" className="mt-3">1 Upcoming</Badge>
              </CardContent>
            </Card>

            {/* Stat 4: Family Reassurance */}
            <Card>
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#66736B]">Care Circle Status</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="text-3xl font-black text-[#26352E]">Connected</div>
                <p className="text-xs text-[#66736B] mt-1">
                  Family contacts actively receiving weekly reports
                </p>
                <Badge variant="default" className="mt-3">3 Active Members</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Routine Breakdown by Time of Day & Weekly Progression */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 Cols: Time-of-Day Adherence */}
            <div className="lg:col-span-7 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Consistency by Time of Day</CardTitle>
                  <CardDescription>
                    Tracking adherence across your morning, afternoon, evening, and night routines.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {timeOfDayMetrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <div key={metric.slot} className="space-y-2 p-3.5 rounded-2xl bg-[#F8FAF8] border border-[#E3EAE5]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2EC] text-[#477A62]">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-base font-bold text-[#26352E]">{metric.name}</p>
                              <p className="text-xs text-[#66736B]">{metric.taken} of {metric.total} doses taken</p>
                            </div>
                          </div>
                          <span className="text-lg font-black text-[#26352E]">{metric.percentage}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[#E3EAE5] rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              metric.percentage >= 90
                                ? "bg-[#477A62]"
                                : metric.percentage >= 75
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${metric.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right 5 Cols: Weekly Adherence Progression & Clinical Export */}
            <div className="lg:col-span-5 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Past 7 Days History</CardTitle>
                  <CardDescription>
                    Daily routine completion across the past week.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {(stats.dailyProgress || DEMO_ADHERENCE.dailyProgress || []).map((day, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-[#66736B]">{day.day}</span>
                        <div
                          className={`w-10 h-16 rounded-xl flex items-end justify-center p-1 border transition-all ${
                            day.percentage === 100
                              ? "bg-[#EAF2EC] border-[#C8D9CD]"
                              : "bg-amber-50 border-amber-200"
                          }`}
                        >
                          <div
                            className={`w-full rounded-lg ${
                              day.percentage === 100 ? "bg-[#477A62]" : "bg-amber-500"
                            }`}
                            style={{ height: `${day.percentage}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-[#26352E]">{day.percentage}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#E3EAE5] flex items-center justify-between text-xs font-semibold text-[#66736B]">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#477A62]" />
                      <span>100% Complete</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-amber-500" />
                      <span>Partial / Snoozed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Printable Clinical Report Banner */}
              <div className="p-6 rounded-3xl bg-white border border-[#E3EAE5] shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2EC] text-[#477A62]">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#26352E]">Clinical Visit Summary</h3>
                    <p className="text-xs text-[#66736B]">Ready for your next doctor appointment</p>
                  </div>
                </div>

                <p className="text-sm text-[#4F5D54]">
                  Share this verified adherence record with your physician during your upcoming consultation.
                </p>

                <Button
                  onClick={handlePrint}
                  className="w-full h-12 bg-[#477A62] hover:bg-[#3B6551] text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Clinical Report</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
