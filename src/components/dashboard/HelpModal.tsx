"use client";

import { useState } from "react";
import { HelpCircle, Check, X, PhoneCall, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Medication } from "@/types";
import { DEMO_PATIENT } from "@/lib/demo-data";

interface HelpModalProps {
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onHelpRequested: (reason: string) => void;
}

export function HelpModal({ medication, isOpen, onClose, onHelpRequested }: HelpModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen || !medication) return null;

  const reasons = [
    "I'm unsure if I already took this dose today",
    "I feel dizzy or unwell after my last dose",
    "I dropped or lost my pill",
    "I'm having trouble swallowing or opening the bottle",
    "I need my caregiver to call me and explain",
  ];

  const handleSubmit = () => {
    if (!selectedReason) return;
    onHelpRequested(selectedReason);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedReason("");
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          aria-label="Close dialog"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <HelpCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Need Help with {medication.name}?
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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
              Message Sent to Caregiver
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs">
              {DEMO_PATIENT.emergencyContact.name} has been notified and will check in with you shortly.
            </p>
          </div>
        ) : (
          <div className="space-y-4 my-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Select what you need help with:
            </p>

            <div className="space-y-2">
              {reasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
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

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="primary"
                size="lg"
                disabled={!selectedReason}
                onClick={handleSubmit}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3"
              >
                <MessageSquareHeart className="h-5 w-5 mr-2" />
                Notify Caregiver
              </Button>
              <a
                href={`tel:${DEMO_PATIENT.emergencyContact.phone}`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <PhoneCall className="h-4 w-4 mr-2 text-teal-600" />
                Call Directly
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
