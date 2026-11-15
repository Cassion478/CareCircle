"use client";

import { useState, useEffect } from "react";
import {
  PhoneCall,
  Calendar,
  CheckCircle,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/types";

interface PatientHeaderProps {
  patient: UserProfile;
  onOpenEmergency: () => void;
  takenCount: number;
  totalCount: number;
}

export function PatientHeader({
  patient,
  onOpenEmergency,
  takenCount,
  totalCount,
}: PatientHeaderProps) {
  const [mood, setMood] = useState<string>("Feeling Well");
  const [moodSaved, setMoodSaved] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<string>("Today's Healthcare Routine");

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentDate(
        new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      );
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleMoodSelect = (selectedMood: string) => {
    setMood(selectedMood);
    setMoodSaved(true);
    setTimeout(() => setMoodSaved(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-teal-700 to-slate-900 text-white p-6 sm:p-8 shadow-lg">
      {/* Decorative Glow Elements */}
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Column: Greeting & Summary */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-200">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              <Calendar className="h-3.5 w-3.5" />
              {currentDate}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/20 px-3 py-1 text-teal-200 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              My Day Routine
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Namaste, {patient.name}! 🙏
          </h1>

          <p className="text-base sm:text-lg text-teal-100/90 leading-relaxed">
            You have completed <span className="font-bold text-white underline decoration-teal-400 decoration-2">{takenCount} of {totalCount}</span> routine steps today.
          </p>

          <p className="text-xs text-teal-200/80">
            Primary family contact: <span className="font-semibold text-white">{patient.emergencyContact.name}</span> ({patient.emergencyContact.phone})
          </p>
        </div>

        {/* Right Column: Assistance Shortcut & Daily Wellbeing */}
        <div className="flex flex-col gap-4 sm:flex-row lg:flex-col lg:items-end justify-center shrink-0">
          {/* Quick Help & Family Dial Button */}
          <Button
            variant="danger"
            onClick={onOpenEmergency}
            size="lg"
            className="h-14 px-6 text-base font-bold bg-rose-600 hover:bg-rose-500 shadow-md hover:shadow-rose-600/30 text-white rounded-2xl flex items-center gap-3 transition-transform active:scale-95"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase font-extrabold tracking-wider opacity-90">
                Immediate Help
              </div>
              <div className="text-sm font-bold">Call Family / Helpline</div>
            </div>
          </Button>

          {/* Daily Wellbeing Check-in */}
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md border border-white/15 text-left w-full sm:w-auto lg:w-72">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-teal-200 flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                How are you feeling today?
              </span>
              {moodSaved && (
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Good 😊", value: "Feeling Well" },
                { label: "Okay 😐", value: "Feeling Okay" },
                { label: "Tired 😴", value: "Resting" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleMoodSelect(item.value)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center min-h-[38px] ${
                    mood === item.value
                      ? "bg-white text-teal-900 shadow-md font-extrabold"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  aria-pressed={mood === item.value}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
