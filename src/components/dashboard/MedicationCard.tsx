"use client";

import { useState } from "react";
import {
  Pill,
  CheckCircle2,
  Clock,
  Volume2,
  Utensils,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Medication } from "@/types";

interface MedicationCardProps {
  medication: Medication;
  onMarkTaken: (id: string) => void;
  onSnooze: (id: string) => void;
  onOpenHelp: (medication: Medication) => void;
}

export function MedicationCard({
  medication,
  onMarkTaken,
  onSnooze,
  onOpenHelp,
}: MedicationCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const isTaken = medication.status === "taken";
  const isSnoozed = medication.status === "snoozed";
  const isPending = medication.status === "pending";

  const handleSpeakInstructions = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const text = `${medication.name}, ${medication.dosage}. Scheduled for ${medication.timeLabel}. Instructions: ${medication.instructions}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for elderly comprehension
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(true);
      setTimeout(() => setIsPlayingAudio(false), 2500);
    }
  };

  const getPillColorClasses = (color?: string) => {
    switch (color) {
      case "rose":
        return "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
      case "teal":
        return "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950 dark:text-teal-300";
      case "amber":
        return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      case "blue":
        return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300";
      case "purple":
        return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300";
      default:
        return "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950 dark:text-teal-300";
    }
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 p-5 sm:p-6 shadow-sm ${
        isTaken
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20"
          : isPending
          ? "border-amber-300 bg-white ring-2 ring-amber-400/30 dark:border-amber-800 dark:bg-slate-900"
          : isSnoozed
          ? "border-purple-200 bg-purple-50/40 dark:border-purple-900/60 dark:bg-purple-950/20"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left Side: Pill Icon & Medication Details */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${getPillColorClasses(
              medication.pillColor
            )}`}
          >
            <Pill className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                {medication.timeLabel}
              </span>

              {isTaken && (
                <Badge variant="success" className="gap-1 font-bold">
                  <CheckCircle2 className="h-3 w-3" />
                  Taken
                </Badge>
              )}
              {isPending && (
                <Badge variant="warning" className="gap-1 font-bold animate-pulse">
                  Due Now
                </Badge>
              )}
              {isSnoozed && (
                <Badge variant="secondary" className="gap-1 font-bold text-purple-700 bg-purple-100">
                  <Clock className="h-3 w-3" />
                  Snoozed 15m
                </Badge>
              )}
              {!isTaken && !isPending && !isSnoozed && (
                <Badge variant="secondary">Scheduled</Badge>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {medication.name}{" "}
              <span className="text-base sm:text-lg font-semibold text-slate-500 dark:text-slate-400">
                {medication.dosage}
              </span>
            </h3>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              {medication.instructions}
            </p>

            {medication.foodRequirement && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <Utensils className="h-3.5 w-3.5 text-teal-600" />
                <span className="capitalize">{medication.foodRequirement.replace("_", " ")}</span>
              </div>
            )}

            {isTaken && medication.lastTaken && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 pt-1">
                ✓ Recorded at {medication.lastTaken}
              </p>
            )}
          </div>
        </div>

        {/* Listen Button (Senior Accessibility) */}
        <button
          onClick={handleSpeakInstructions}
          className={`self-start flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            isPlayingAudio
              ? "bg-teal-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          }`}
          title="Read instructions aloud"
        >
          <Volume2 className={`h-4 w-4 ${isPlayingAudio ? "animate-pulse" : ""}`} />
          <span>{isPlayingAudio ? "Reading..." : "Read Aloud"}</span>
        </button>
      </div>

      {/* Large Accessible Action Buttons */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isTaken ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => onMarkTaken(medication.id)}
              className="h-12 px-6 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-emerald-600/20 rounded-xl gap-2 active:scale-95 transition-transform"
            >
              <CheckCircle2 className="h-5 w-5" />
              Mark as Taken
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkTaken(medication.id)}
              className="text-xs text-slate-500 hover:text-slate-700 gap-1 rounded-lg"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo Taken
            </Button>
          )}

          {!isTaken && (
            <Button
              variant="outline"
              size="md"
              onClick={() => onSnooze(medication.id)}
              className="h-12 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl gap-1.5"
            >
              <Clock className="h-4 w-4" />
              Snooze 15m
            </Button>
          )}
        </div>

        <button
          onClick={() => onOpenHelp(medication)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Need Help?
        </button>
      </div>
    </div>
  );
}
