"use client";

import { useState } from "react";
import {
  SunMedium,
  Sun,
  Sunset,
  Moon,
  Pill,
  Sparkles,
} from "lucide-react";
import { MedicationCard } from "./MedicationCard";
import { Medication, TimeSlot } from "@/types";

interface MedicationTimelineProps {
  medications: Medication[];
  onMarkTaken: (id: string) => void;
  onSnooze: (id: string) => void;
  onOpenHelp: (medication: Medication) => void;
}

export function MedicationTimeline({
  medications,
  onMarkTaken,
  onSnooze,
  onOpenHelp,
}: MedicationTimelineProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "taken">("all");

  const slots: { slot: TimeSlot; label: string; icon: typeof SunMedium; timeRange: string }[] = [
    { slot: "morning", label: "Morning", icon: SunMedium, timeRange: "6:00 AM - 11:59 AM" },
    { slot: "afternoon", label: "Afternoon", icon: Sun, timeRange: "12:00 PM - 4:59 PM" },
    { slot: "evening", label: "Evening", icon: Sunset, timeRange: "5:00 PM - 8:59 PM" },
    { slot: "night", label: "Night / Bedtime", icon: Moon, timeRange: "9:00 PM onwards" },
  ];

  const filteredMeds = medications.filter((med) => {
    if (filter === "taken") return med.status === "taken";
    if (filter === "pending") return med.status !== "taken";
    return true;
  });

  const takenCount = medications.filter((m) => m.status === "taken").length;
  const progressPercent = Math.round((takenCount / medications.length) * 100) || 0;

  return (
    <div className="space-y-6">
      {/* Header and Progress Indicator */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="h-6 w-6 text-teal-600" />
                Today&apos;s Medication Schedule
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Clear checklist designed for easy reading and confirmation.
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                filter === "all"
                  ? "bg-white text-teal-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              All ({medications.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                filter === "pending"
                  ? "bg-white text-teal-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Due ({medications.length - takenCount})
            </button>
            <button
              onClick={() => setFilter("taken")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                filter === "taken"
                  ? "bg-white text-teal-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Taken ({takenCount})
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              Day Progress: {takenCount} of {medications.length} doses taken
            </span>
            <span className="text-teal-700 dark:text-teal-400 font-bold">
              {progressPercent}% Complete
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Categorized Slots Timeline */}
      <div className="space-y-8">
        {slots.map(({ slot, label, icon: Icon, timeRange }) => {
          const slotMeds = filteredMeds.filter((m) => m.timeSlot === slot);
          if (slotMeds.length === 0) return null;

          return (
            <div key={slot} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                    {label}
                  </h3>
                  <p className="text-xs text-slate-400">{timeRange}</p>
                </div>
              </div>

              <div className="space-y-3 pl-0 sm:pl-12">
                {slotMeds.map((med) => (
                  <MedicationCard
                    key={med.id}
                    medication={med}
                    onMarkTaken={onMarkTaken}
                    onSnooze={onSnooze}
                    onOpenHelp={onOpenHelp}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filteredMeds.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-500">
              No medications matching this view.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
