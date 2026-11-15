import Link from "next/link";
import { HeartPulse, Bell, Calendar, Pill, Users, SunMedium } from "lucide-react";
import { DEMO_PATIENT } from "@/lib/demo-data";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/20">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                CareCircle
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Elderly Healthcare Companion
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-lg"
            >
              <SunMedium className="h-4 w-4 text-amber-500" />
              My Day
            </Link>
            <span className="flex items-center gap-1.5 text-slate-400 cursor-not-allowed">
              <Pill className="h-4 w-4" />
              Medications
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 cursor-not-allowed">
              <Calendar className="h-4 w-4" />
              Appointments
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 cursor-not-allowed">
              <Users className="h-4 w-4" />
              Family Circle
            </span>
          </nav>
        </div>

        {/* Right Section: Patient Profile & Status */}
        <div className="flex items-center gap-3">
          {/* Phase Badge */}
          <div className="hidden sm:inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-950 dark:text-teal-300">
            Phase 1: My Day
          </div>

          {/* Notification Icon */}
          <div className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-teal-600" />
          </div>

          {/* Active Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white shadow-xs">
              EC
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {DEMO_PATIENT.name}
              </span>
              <span className="text-[10px] text-slate-500">Age {DEMO_PATIENT.age} • Senior</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
