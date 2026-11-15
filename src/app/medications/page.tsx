"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  Pill,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Edit2,
  X,
  History,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { DbMedication, DbMedicationDoseLog } from "@/types";
import { formatTimeLabel, validateMedication } from "@/lib/medications";
import { DEMO_MEDICATIONS } from "@/lib/demo-data";

const COMMON_TIMES = [
  { label: "Morning", time: "08:00" },
  { label: "Noon / Lunch", time: "13:00" },
  { label: "Evening", time: "19:00" },
  { label: "Night / Bedtime", time: "21:00" },
];

function MedicationsContent() {
  const { user, loading: authLoading } = useAuth();
  const [medications, setMedications] = useState<DbMedication[]>([]);
  const [doseLogs, setDoseLogs] = useState<DbMedicationDoseLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["08:00"]);
  const [customTime, setCustomTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const loadData = useCallback(async (userId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();

      // 1. Fetch patient's medications
      const { data: meds, error: medsErr } = await supabase
        .from("medications")
        .select("*")
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      if (medsErr) {
        setErrorMessage(medsErr.message);
        setIsLoading(false);
        return;
      }

      setMedications(meds || []);

      // 2. Fetch patient's dose history (latest 50 records)
      const { data: logs, error: logsErr } = await supabase
        .from("medication_dose_logs")
        .select("*")
        .eq("patient_id", userId)
        .order("scheduled_for", { ascending: false })
        .limit(50);

      if (!logsErr && logs) {
        setDoseLogs(logs);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load medication records.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      await Promise.resolve();
      if (isCancelled) return;

      if (user) {
        await loadData(user.id);
      } else {
        setIsLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user, loadData]);

  const openAddModal = () => {
    setEditingMedId(null);
    setName("");
    setDosage("");
    setInstructions("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setSelectedTimes(["08:00"]);
    setCustomTime("");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (med: DbMedication) => {
    setEditingMedId(med.id);
    setName(med.name);
    setDosage(med.dosage);
    setInstructions(med.instructions || "");
    setStartDate(med.start_date);
    setEndDate(med.end_date || "");
    setSelectedTimes(med.scheduled_times || ["08:00"]);
    setCustomTime("");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const toggleTimeSelection = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time].sort()
    );
  };

  const addCustomTime = () => {
    if (!customTime) return;
    if (!selectedTimes.includes(customTime)) {
      setSelectedTimes((prev) => [...prev, customTime].sort());
    }
    setCustomTime("");
  };

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validation = validateMedication({
      name,
      dosage,
      startDate,
      endDate: endDate || null,
      scheduledTimes: selectedTimes,
    });

    if (!validation.isValid) {
      setErrorMessage(validation.error || "Please check the form inputs.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      if (editingMedId) {
        // Update existing medication
        const { error } = await supabase
          .from("medications")
          .update({
            name: name.trim(),
            dosage: dosage.trim(),
            instructions: instructions.trim() || null,
            start_date: startDate,
            end_date: endDate || null,
            scheduled_times: selectedTimes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMedId)
          .eq("patient_id", user.id);

        if (error) throw error;
        showSuccess(`Updated ${name} successfully.`);
      } else {
        // Insert new medication
        const { error } = await supabase.from("medications").insert({
          patient_id: user.id,
          name: name.trim(),
          dosage: dosage.trim(),
          instructions: instructions.trim() || null,
          start_date: startDate,
          end_date: endDate || null,
          scheduled_times: selectedTimes,
          is_active: true,
        });

        if (error) throw error;
        showSuccess(`Added ${name} to your daily routine.`);
      }

      setIsModalOpen(false);
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save medication.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (med: DbMedication) => {
    if (!user) return;
    try {
      const supabase = createClient();
      const newStatus = !med.is_active;

      const { error } = await supabase
        .from("medications")
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq("id", med.id)
        .eq("patient_id", user.id);

      if (error) throw error;

      showSuccess(`${med.name} marked as ${newStatus ? "active" : "paused"}.`);
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      setErrorMessage(msg);
    }
  };

  const handleDeleteMedication = async (med: DbMedication) => {
    if (!user) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${med.name}? This will also remove scheduled doses.`
    );
    if (!confirmed) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("id", med.id)
        .eq("patient_id", user.id);

      if (error) throw error;

      showSuccess(`Deleted ${med.name}.`);
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete medication.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 dark:bg-slate-950">
      {/* Top Breadcrumb & Header Bar */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900 dark:text-teal-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to My Day Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-950 dark:text-teal-300">
              Phase 3: Persistent Regimens
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        {/* Title & Action Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              <Pill className="h-4 w-4" />
              Medication Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              My Medicine Schedule
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage your daily medicines, dosages, and reminder times.
            </p>
          </div>

          {user && (
            <Button
              onClick={openAddModal}
              size="lg"
              className="h-13 px-6 text-base font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0"
            >
              <Plus className="h-5 w-5" />
              <span>Add New Medicine</span>
            </Button>
          )}
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div
            role="status"
            className="rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 p-4 text-sm text-teal-800 dark:text-teal-200 flex items-center gap-3 animate-in fade-in"
          >
            <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-4 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Unauthenticated Mode Notice */}
        {!user && !authLoading && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
              <div>
                <h2 className="text-base font-bold text-amber-900 dark:text-amber-200">
                  Viewing in Demonstration Mode
                </h2>
                <p className="text-sm text-amber-800/90 dark:text-amber-300/80 mt-1">
                  You are previewing pre-configured demonstration medicines (Smt. Shanti Devi). Sign in or register to store and manage your own persistent medication regimen in Supabase.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/login?redirectTo=/medications">
                <Button className="bg-teal-600 hover:bg-teal-500 text-white font-bold h-11 px-5 rounded-xl">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" className="font-bold h-11 px-5 rounded-xl">
                  Register
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent mx-auto" />
            <p className="text-sm font-semibold text-slate-500">Loading your medication list...</p>
          </div>
        )}

        {/* Content: Active Medications List */}
        {!isLoading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="h-5 w-5 text-teal-600" />
                <span>Active Medicines</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {user ? medications.length : DEMO_MEDICATIONS.length}
                </span>
              </h2>
            </div>

            {/* If user is logged in but has no medications yet */}
            {user && medications.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                <div className="h-16 w-16 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mx-auto">
                  <Pill className="h-8 w-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    No medications added yet
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Keep track of your pills, dosages, and timings by adding your daily prescriptions.
                  </p>
                </div>
                <Button
                  onClick={openAddModal}
                  size="lg"
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold h-12 px-6 rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Medicine
                </Button>
              </div>
            )}

            {/* Authenticated Patient Medications Grid */}
            {user && medications.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    className={`rounded-2xl p-5 border bg-white dark:bg-slate-900 transition-shadow ${
                      med.is_active
                        ? "border-slate-200 dark:border-slate-800 shadow-sm"
                        : "border-slate-200/60 bg-slate-50/50 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                          {med.name}
                        </h3>
                        <p className="text-sm font-semibold text-teal-700 dark:text-teal-400 mt-0.5">
                          {med.dosage}
                        </p>
                      </div>
                      <Badge variant={med.is_active ? "success" : "secondary"}>
                        {med.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>

                    {med.instructions && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl mb-3">
                        {med.instructions}
                      </p>
                    )}

                    {/* Timings */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-teal-600" />
                        <span className="font-semibold">Daily Schedule:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {med.scheduled_times.map((t) => (
                          <span
                            key={t}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300"
                          >
                            {formatTimeLabel(t)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleActive(med)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      >
                        {med.is_active ? "Pause Medicine" : "Resume Medicine"}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(med)}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Medicine"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedication(med)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Delete Medicine"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unauthenticated Demo Grid */}
            {!user && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {DEMO_MEDICATIONS.map((med) => (
                  <div
                    key={med.id}
                    className="rounded-2xl p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                          {med.name}
                        </h3>
                        <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                          {med.dosage}
                        </p>
                      </div>
                      <Badge variant="secondary">Demo</Badge>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                      {med.instructions}
                    </p>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-teal-600" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">{med.timeLabel}</span>
                      <span>({med.timeSlot})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: Medication Dose History */}
        {user && doseLogs.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-teal-600" />
              <span>Recent Dose History</span>
            </h2>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Scheduled Date & Time</th>
                      <th className="px-5 py-3.5">Medicine</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Recorded Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {doseLogs.map((log) => {
                      const matchedMed = medications.find((m) => m.id === log.medication_id);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                            {new Date(log.scheduled_for).toLocaleDateString("en-IN", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(log.scheduled_for).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {matchedMed ? `${matchedMed.name} (${matchedMed.dosage})` : "Prescribed Medicine"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                log.status === "taken"
                                  ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                                  : log.status === "snoozed"
                                  ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : log.status === "need_help"
                                  ? "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {log.status === "taken"
                                ? "✓ Taken"
                                : log.status === "snoozed"
                                ? "⏰ Snoozed"
                                : log.status === "need_help"
                                ? "Assistance Logged"
                                : "Pending"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500">
                            {log.taken_at
                              ? new Date(log.taken_at).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : log.snoozed_until
                              ? `Snoozed to ${new Date(log.snoozed_until).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accessible Elderly Add/Edit Medication Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              aria-label="Close dialog"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingMedId ? "Edit Medicine" : "Add Medicine"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Enter your prescription details below.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMedication} className="space-y-5">
              {/* Medicine Name */}
              <div>
                <label
                  htmlFor="medName"
                  className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                >
                  Medicine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="medName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Metformin, Amlodipine"
                  className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Dosage */}
              <div>
                <label
                  htmlFor="medDosage"
                  className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                >
                  Dosage <span className="text-rose-500">*</span>
                </label>
                <input
                  id="medDosage"
                  type="text"
                  required
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. 500 mg, 1 tablet, 5 ml"
                  className="w-full px-4 py-3.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Scheduled Routine Times */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  When should you take it? <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Select one or more daily times:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_TIMES.map((slot) => {
                    const isSelected = selectedTimes.includes(slot.time);
                    return (
                      <button
                        type="button"
                        key={slot.time}
                        onClick={() => toggleTimeSelection(slot.time)}
                        className={`p-3 rounded-xl border text-left font-bold text-sm transition-all ${
                          isSelected
                            ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200 ring-2 ring-teal-500/20"
                            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="text-xs opacity-75">{slot.label}</div>
                        <div className="text-base">{formatTimeLabel(slot.time)}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Time */}
                <div className="flex gap-2 mt-2.5">
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomTime}
                    className="text-xs font-bold rounded-xl"
                  >
                    Add Custom Time
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label
                  htmlFor="medInstructions"
                  className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                >
                  Doctor / Food Instructions <span className="text-xs font-normal text-slate-500">(Optional)</span>
                </label>
                <input
                  id="medInstructions"
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take with warm water after breakfast"
                  className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    End Date <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="flex-1 h-13 text-base font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md"
                >
                  {isSubmitting ? "Saving..." : editingMedId ? "Update Medicine" : "Add to Routine"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="h-13 px-5 font-bold rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MedicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50/70 p-8 text-center text-slate-500 dark:bg-slate-950 font-bold">
          Loading medication routine...
        </div>
      }
    >
      <MedicationsContent />
    </Suspense>
  );
}
