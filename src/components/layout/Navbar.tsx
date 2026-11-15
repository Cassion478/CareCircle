"use client";

import Link from "next/link";
import {
  HeartPulse,
  Bell,
  Calendar,
  Pill,
  Users,
  SunMedium,
  ShieldCheck,
  User,
  LogIn,
  LogOut,
} from "lucide-react";
import { DEMO_PATIENT } from "@/lib/demo-data";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.fullName || user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : null);
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SD";

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
                Healthcare Companion
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-bold bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-lg"
            >
              <SunMedium className="h-4 w-4 text-amber-500" />
              My Day
            </Link>
            <Link
              href="/caregiver"
              className="flex items-center gap-1.5 text-slate-600 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              Family Portal
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-1.5 text-slate-600 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <User className="h-4 w-4 text-teal-600" />
              Profile
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
              Care Circle
            </span>
          </nav>
        </div>

        {/* Right Section: Patient Profile & Status */}
        <div className="flex items-center gap-3">
          {/* Phase Badge */}
          <div className="hidden sm:inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-950 dark:text-teal-300">
            Phase 2: Auth & Profile
          </div>

          {/* Notification Icon */}
          <div
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Local Notifications"
            aria-label="Local Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-teal-600" />
          </div>

          {/* Active Profile Pill / Sign In */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <Link
                href="/profile"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                title="View Healthcare Profile"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white shadow-xs">
                  {initials}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                    My Profile
                  </span>
                </div>
              </Link>

              <button
                onClick={() => signOut()}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer ml-1"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Link>

              <div
                className="hidden md:flex items-center gap-2 pl-1 text-left"
                title="Exploring in public demo mode"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
                  SD
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                    {DEMO_PATIENT.name}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Demo Mode</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
