import {
  Pill,
  Users,
  BellRing,
  ShieldCheck,
  CalendarCheck,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  const highlights = [
    {
      title: "Smart Medication Schedules",
      description: "Visual daily dosage tracker with automatic reminders, status updates (Taken, Pending, Missed), and history logs.",
      icon: Pill,
      phase: "Phase 3",
      status: "Upcoming",
    },
    {
      title: "Family & Caregiver Circles",
      description: "Secure invite codes enabling family members and care partners to monitor adherence and coordinate care effortlessly.",
      icon: Users,
      phase: "Phase 4",
      status: "Upcoming",
    },
    {
      title: "Intelligent Alert Escalation",
      description: "Automated missed-medication escalation notifying designated emergency contacts and caregivers when doses are missed.",
      icon: BellRing,
      phase: "Phase 5",
      status: "Upcoming",
    },
    {
      title: "Doctor Appointments & Visits",
      description: "Unified healthcare schedule with upcoming appointments, doctor contact details, and clinic locations.",
      icon: CalendarCheck,
      phase: "Phase 4",
      status: "Upcoming",
    },
  ];

  const roadmap = [
    { phase: "Phase 0", title: "Repository & Foundation", status: "Active / Completed", current: true },
    { phase: "Phase 1", title: "UI Foundation & Dashboard", status: "Next", current: false },
    { phase: "Phase 2", title: "Auth & Healthcare Profile", status: "Planned", current: false },
    { phase: "Phase 3", title: "Medication Management", status: "Core Feature", current: false },
    { phase: "Phase 4", title: "Family & Appointments", status: "Collaboration", current: false },
    { phase: "Phase 5", title: "Smart Alert Intelligence", status: "Innovation", current: false },
    { phase: "Phase 6", title: "Analytics & UI Polish", status: "Quality", current: false },
    { phase: "Phase 7", title: "Deployment & Release", status: "Final", current: false },
  ];

  return (
    <div className="flex flex-col gap-12 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white p-8 sm:p-12 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3.5 py-1 text-xs font-medium text-teal-200 border border-teal-500/30">
            <ShieldCheck className="h-4 w-4" />
            Hackathon Development in Progress
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            CareCircle
          </h1>
          <p className="text-lg text-teal-100/90 leading-relaxed max-w-2xl">
            A proactive, compassionate healthcare and medication management platform designed for elderly individuals, their families, and dedicated caregivers.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button variant="primary" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold gap-2">
              <Activity className="h-4 w-4" />
              Phase 0 Foundation Ready
            </Button>
            <div className="text-sm text-teal-200/80 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-teal-400" />
              Next.js 16 + TypeScript + Tailwind CSS
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Grid */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Core Platform Capabilities
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Designed to bridge the gap between independent senior living and peace of mind for families.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary">{item.phase}</Badge>
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {item.status}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Development Roadmap */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Phase-Based Development Roadmap
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Strict incremental delivery using feature branches and Pull Requests.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {roadmap.map((stage) => (
            <div
              key={stage.phase}
              className={`p-4 rounded-xl border transition-all ${
                stage.current
                  ? "border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 shadow-sm"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 opacity-80"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400">
                  {stage.phase}
                </span>
                {stage.current ? (
                  <Badge variant="success">Completed</Badge>
                ) : (
                  <Badge variant="secondary">{stage.status}</Badge>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {stage.title}
              </h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
