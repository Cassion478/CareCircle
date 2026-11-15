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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const text = `${medication.name}, dosage ${medication.dosage}. Scheduled for ${medication.timeLabel}. Instructions: ${medication.instructions}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85; // Slower, comfortable speed for elderly listeners
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(true);
      setTimeout(() => setIsPlayingAudio(false), 2000);
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
      className={`relative rounded-2xl border transition-all duration-200 p-4 sm:p-6 shadow-sm ${
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
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
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
                <Badge variant="warning" className="gap-1 font-bold">
                  Due Now
                </Badge>
              )}
              {isSnoozed && (
                <Badge variant="secondary" className="gap-1 font-bold text-purple-700 bg-purple-100 dark:bg-purple-950 dark:text-purple-300">
                  <Clock className="h-3 w-3" />
                  {medication.snoozedUntil || "Snoozed (10 mins)"}
                </Badge>
              )}
              {medication.status === "need_help" && (
                <Badge variant="danger" className="gap-1 font-bold">
                  <HelpCircle className="h-3 w-3" />
                  Assistance Logged
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

            <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed max-w-xl">
              {medication.instructions}
            </p>

            {medication.foodRequirement && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <Utensils className="h-3.5 w-3.5 text-teal-600" />
                <span className="capitalize">{medication.foodRequirement.replace("_", " ")}</span>
              </div>
            )}

            {isTaken && medication.lastTaken && (
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 pt-1">
                ✓ Confirmed at {medication.lastTaken}
              </p>
            )}
          </div>
        </div>

        {/* Read Aloud Button (Senior Audio Accessibility) */}
        <button
          onClick={handleSpeakInstructions}
          className={`self-start min-h-[40px] flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            isPlayingAudio
              ? "bg-teal-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          }`}
          title="Read medication instructions aloud"
          aria-label={`Read aloud instructions for ${medication.name}`}
        >
          <Volume2 className={`h-4 w-4 ${isPlayingAudio ? "animate-pulse text-white" : "text-teal-600"}`} />
          <span>{isPlayingAudio ? "Reading Aloud..." : "Read Aloud"}</span>
        </button>
      </div>

      {/* Large Accessible Action Controls */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {!isTaken ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => onMarkTaken(medication.id)}
              className="min-h-[48px] px-6 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm rounded-xl gap-2 active:scale-95 transition-transform"
            >
              <CheckCircle2 className="h-5 w-5" />
              Mark as Taken
            </Button>
          ) : (
            <Button
              variant="outline"
              size="md"
              onClick={() => onMarkTaken(medication.id)}
              className="min-h-[44px] text-xs sm:text-sm text-slate-600 hover:text-slate-900 gap-1.5 rounded-xl border-slate-300"
            >
              <RotateCcw className="h-4 w-4" />
              Tap to Undo if Marked by Mistake
            </Button>
          )}

          {!isTaken && (
            <Button
              variant="outline"
              size="md"
              onClick={() => onSnooze(medication.id)}
              className="min-h-[48px] px-4 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl gap-1.5 border-slate-300"
            >
              <Clock className="h-4 w-4 text-slate-500" />
              Snooze 10 min
            </Button>
          )}
        </div>

        <button
          onClick={() => onOpenHelp(medication)}
          className="min-h-[44px] inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <HelpCircle className="h-4 w-4 text-teal-600" />
          Need Assistance?
        </button>
      </div>
    </div>
  );
}
