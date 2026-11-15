"use client";

import { AlertTriangle, Phone, PhoneCall, X, ShieldAlert, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_PATIENT, DEMO_CAREGIVERS } from "@/lib/demo-data";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateAlert: () => void;
}

export function EmergencyModal({ isOpen, onClose, onSimulateAlert }: EmergencyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border-2 border-rose-500 dark:bg-slate-900 dark:border-rose-600">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          aria-label="Close dialog"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 text-rose-600 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60">
            <AlertTriangle className="h-7 w-7 text-rose-600 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Emergency & Caregiver Contact
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Immediate help options for {DEMO_PATIENT.name}
            </p>
          </div>
        </div>

        <div className="space-y-4 my-6">
          {/* Primary Caregiver Contact */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 dark:border-teal-800 dark:bg-teal-950/40">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                  Primary Emergency Contact
                </span>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {DEMO_PATIENT.emergencyContact.name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {DEMO_PATIENT.emergencyContact.relationship} • {DEMO_PATIENT.emergencyContact.phone}
                </p>
              </div>
              <a
                href={`tel:${DEMO_PATIENT.emergencyContact.phone}`}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white shadow-md hover:bg-teal-700 transition-colors"
                title="Call Primary Contact"
              >
                <PhoneCall className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Quick Alert Circle Button */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">
                  Notify Entire Care Circle
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Sends an immediate alert to all {DEMO_CAREGIVERS.length} family members and nurses.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  onSimulateAlert();
                  onClose();
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 font-semibold"
              >
                <ShieldAlert className="h-4 w-4 mr-1.5" />
                Alert Circle
              </Button>
            </div>
          </div>

          {/* Emergency 911 Call */}
          <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-4 dark:border-rose-900 dark:bg-rose-950/40">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                  Call Medical Emergency (911)
                </h3>
                <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                  For severe medical distress, chest pain, or falls.
                </p>
              </div>
              <a
                href="tel:911"
                className="flex h-12 items-center gap-2 rounded-xl bg-rose-600 px-4 text-white font-bold shadow-md hover:bg-rose-700 transition-colors"
              >
                <Phone className="h-5 w-5" />
                Call 911
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-rose-500" />
            CareCircle Priority Assistance
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
