"use client";

import { useState } from "react";
import { HelpCircle, Check, X, PhoneCall, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Medication, UserProfile } from "@/types";

interface HelpModalProps {
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onHelpRequested: (reason: string) => void;
  patient?: UserProfile | null;
}

export function HelpModal({
  medication,
  isOpen,
  onClose,
  onHelpRequested,
  patient,
}: HelpModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen || !medication) return null;

  const contactName = patient?.emergencyContact?.name || "Family";
  const contactPhone = patient?.emergencyContact?.phone;
  const hasPhone = Boolean(contactPhone && contactPhone !== "None configured");

  const reasons = [
    "I'm unsure if I already took this dose today",
    "I'm feeling dizzy or unwell after my dose",
    "I dropped or misplaced my tablet",
    "I'm having trouble opening the medication container",
    `I want to speak with ${contactName} before taking this`,
  ];

  const handleSubmit = () => {
    if (!selectedReason) return;
    onHelpRequested(selectedReason);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedReason("");
      onClose();
    }, 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          aria-label="Close assistance dialog"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <HelpCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 id="help-dialog-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Assistance for {medication.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {medication.dosage} • Scheduled for {medication.timeLabel}
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="my-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <Check className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Assistance Note Recorded
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm">
              Your note has been saved to your medication log. Please call {contactName} directly if you need immediate assistance.
            </p>
          </div>
        ) : (
          <div className="space-y-4 my-5">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <strong>Notice:</strong> This logs an assistance note in your healthcare record. It is not an automated medical emergency dispatch.
            </div>

            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              What do you need help with?
            </p>

            <div className="space-y-2">
              {reasons.map((reason) => (
                <button
                  type="button"
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-between min-h-[44px] ${
                    selectedReason === reason
                      ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-100 ring-2 ring-teal-600"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span>{reason}</span>
                  {selectedReason === reason && (
                    <Check className="h-4 w-4 text-teal-600 shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <Button
                variant="primary"
                size="lg"
                disabled={!selectedReason}
                onClick={handleSubmit}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 min-h-[48px] rounded-xl"
              >
                <MessageSquareHeart className="h-5 w-5 mr-2" />
                Record Assistance Note
              </Button>
              {hasPhone ? (
                <a
                  href={`tel:${contactPhone}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 min-h-[48px]"
                >
                  <PhoneCall className="h-4 w-4 mr-2 text-teal-600" />
                  Call {contactName}
                </a>
              ) : (
                <a
                  href="tel:112"
                  className="inline-flex items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-100 min-h-[48px]"
                >
                  <PhoneCall className="h-4 w-4 mr-2 text-rose-600" />
                  Call 112 (Helpline)
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
