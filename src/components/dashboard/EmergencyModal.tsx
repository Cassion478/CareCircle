"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Phone, PhoneCall, X, Heart, Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/types";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateAlert: () => void;
  patient?: UserProfile | null;
}

export function EmergencyModal({
  isOpen,
  onClose,
  onSimulateAlert,
  patient,
}: EmergencyModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasEmergencyContact = Boolean(
    patient?.emergencyContact?.phone &&
    patient.emergencyContact.phone !== "None configured"
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border-2 border-rose-500 dark:bg-slate-900 dark:border-rose-600">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          aria-label="Close emergency dialog"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 text-rose-600 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60">
            <AlertTriangle className="h-7 w-7 text-rose-600" />
          </div>
          <div>
            <h2 id="emergency-dialog-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Immediate Help & Emergency
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Direct assistance options for {patient?.name || "Patient"}
            </p>
          </div>
        </div>

        <div className="space-y-4 my-5">
          {/* Primary Family Contact Option */}
          {hasEmergencyContact && patient?.emergencyContact ? (
            <div className="rounded-2xl border-2 border-teal-500/40 bg-teal-50/70 p-4 dark:border-teal-800 dark:bg-teal-950/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                    Primary Family Contact
                  </span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {patient.emergencyContact.name}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {patient.emergencyContact.relationship} • {patient.emergencyContact.phone}
                  </p>
                </div>
                <a
                  href={`tel:${patient.emergencyContact.phone}`}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md hover:bg-teal-700 transition-colors"
                  title={`Call ${patient.emergencyContact.name}`}
                >
                  <PhoneCall className="h-6 w-6" />
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Family Contact Missing
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    No family emergency contact set
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Add a primary contact in your profile for instant one-touch dialing.
                  </p>
                </div>
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add</span>
                </Link>
              </div>
            </div>
          )}

          {/* National Emergency Helpline (India 112 & 108) */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    India Emergency Contacts
                  </span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    National Helpline (112) • Ambulance (108)
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Opens your device dialer. CareCircle does not provide automated emergency dispatch.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="tel:112"
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-rose-700 min-h-[44px]"
                >
                  <Phone className="h-4 w-4" />
                  Call 112 (All Emergency)
                </a>
                <a
                  href="tel:108"
                  className="flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-rose-800 min-h-[44px]"
                >
                  <Phone className="h-4 w-4" />
                  Call 108 (Ambulance)
                </a>
              </div>
            </div>
          </div>

          {/* Notify Family Circle */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Send Family Check-in Alert
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logs a high-priority assistance notification on your local family board.
                </p>
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  onSimulateAlert();
                  onClose();
                }}
                className="shrink-0 font-bold border-slate-300"
              >
                <Shield className="h-4 w-4 mr-1 text-teal-600" />
                Notify Circle
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-rose-500" />
            CareCircle Assistance
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
