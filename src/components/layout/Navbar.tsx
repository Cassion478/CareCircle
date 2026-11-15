import Link from "next/link";
import { HeartPulse, Bell, Calendar, Pill } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                CareCircle
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Healthcare & Medication
              </span>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link
            href="/"
            className="flex items-center gap-1.5 transition-colors hover:text-teal-600"
          >
            Overview
          </Link>
          <span className="flex items-center gap-1.5 text-slate-400 cursor-not-allowed">
            <Pill className="h-4 w-4" />
            Medications
            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-500">
              Phase 3
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 cursor-not-allowed">
            <Calendar className="h-4 w-4" />
            Appointments
            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-500">
              Phase 4
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 cursor-not-allowed">
            <Bell className="h-4 w-4" />
            Alerts
            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-500">
              Phase 5
            </span>
          </span>
        </nav>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/20">
            Phase 0 Foundation
          </div>
        </div>
      </div>
    </header>
  );
}
