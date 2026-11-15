"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  User,
  Check,
  Ban,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { DbAppointment, AppointmentStatus } from "@/types";
import {
  validateAppointment,
  formatAppointmentDate,
  formatAppointmentTime,
  sortAppointments,
} from "@/lib/appointments";

function AppointmentsContent() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<DbAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tab: upcoming vs past
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAptId, setEditingAptId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [location, setLocation] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("scheduled");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete target
  const [deleteTarget, setDeleteTarget] = useState<DbAppointment | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const loadData = useCallback(async (userId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", userId)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setAppointments(data || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load appointments.";
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
    setEditingAptId(null);
    setTitle("");
    setDoctorName("");
    setLocation("");
    // Default to today or tomorrow
    const today = new Date();
    today.setDate(today.getDate() + 1);
    setAppointmentDate(today.toISOString().split("T")[0]);
    setAppointmentTime("10:00");
    setNotes("");
    setStatus("scheduled");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (apt: DbAppointment) => {
    setEditingAptId(apt.id);
    setTitle(apt.title);
    setDoctorName(apt.doctor_name || "");
    setLocation(apt.location || "");
    setAppointmentDate(apt.appointment_date);
    setAppointmentTime(apt.appointment_time.slice(0, 5));
    setNotes(apt.notes || "");
    setStatus(apt.status);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const isNew = !editingAptId;
    const validation = validateAppointment(
      {
        title,
        doctorName: doctorName || null,
        location: location || null,
        appointmentDate,
        appointmentTime,
        notes: notes || null,
        status,
      },
      isNew,
      new Date()
    );

    if (!validation.isValid) {
      setErrorMessage(validation.error || "Please verify your appointment details.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const payload = {
        patient_id: user.id,
        title: title.trim(),
        doctor_name: doctorName.trim() || null,
        location: location.trim() || null,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes: notes.trim() || null,
        status,
        updated_at: new Date().toISOString(),
      };

      if (editingAptId) {
        const { error } = await supabase
          .from("appointments")
          .update(payload)
          .eq("id", editingAptId)
          .eq("patient_id", user.id);

        if (error) throw error;
        showSuccess(`Updated "${title}" appointment.`);
      } else {
        const { error } = await supabase.from("appointments").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
        showSuccess(`Scheduled "${title}" for ${formatAppointmentDate(appointmentDate)}.`);
      }

      setIsModalOpen(false);
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save appointment.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (apt: DbAppointment, newStatus: AppointmentStatus) => {
    if (!user) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", apt.id)
        .eq("patient_id", user.id);

      if (error) throw error;
      showSuccess(`Marked "${apt.title}" as ${newStatus}.`);
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update appointment status.";
      setErrorMessage(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deleteTarget) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("patient_id", user.id);

      if (error) throw error;
      showSuccess(`Removed "${deleteTarget.title}".`);
      setDeleteTarget(null);
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete appointment.";
      setErrorMessage(msg);
    }
  };

  // Filter into Upcoming vs Past
  const todayStr = new Date().toISOString().split("T")[0];
  const referenceDateStr = todayStr;
  const upcomingApts = appointments.filter(
    (a) => a.appointment_date >= referenceDateStr && a.status === "scheduled"
  );
  const pastApts = appointments.filter(
    (a) => a.appointment_date < referenceDateStr || a.status !== "scheduled"
  );

  const displayedApts = activeTab === "upcoming" ? sortAppointments(upcomingApts, true) : sortAppointments(pastApts, false);

  return (
    <div className="min-h-screen bg-[#F8FAF8] pb-16">
      {/* Top Breadcrumb Bar */}
      <div className="border-b border-[#E3EAE5] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/my-day"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#477A62] hover:text-[#3B6551] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to My Day Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#EAF2EC] px-3.5 py-1 text-xs font-bold text-[#26352E] border border-[#C8D9CD]">
              Medical Schedule
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        {/* Title & Action Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#E3EAE5] shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#477A62] uppercase tracking-wider">
              <Calendar className="h-4 w-4" />
              Medical Consultations
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#26352E]">
              Doctor Appointments & Visits
            </h1>
            <p className="text-base text-[#66736B]">
              Keep track of clinic visits, diagnostic tests, and doctor checkups.
            </p>
          </div>

          {user && (
            <Button
              onClick={openAddModal}
              size="lg"
              className="h-13 px-6 text-base font-bold bg-[#477A62] hover:bg-[#3B6551] text-white rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span>Schedule New Visit</span>
            </Button>
          )}
        </div>

        {/* Feedback Alerts */}
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

        {/* Tab Controls (Upcoming vs Past) */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "upcoming"
                ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Upcoming Visits ({upcomingApts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("past")}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "past"
                ? "bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Past & Completed ({pastApts.length})
          </button>
        </div>

        {/* Content Section: Appointments List */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              Loading your appointment records...
            </p>
          </div>
        ) : (
          <div>
            {displayedApts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 sm:p-14 text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600">
                  <Calendar className="h-8 w-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeTab === "upcoming"
                      ? "No upcoming visits scheduled"
                      : "No past appointment records"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {activeTab === "upcoming"
                      ? "Keep your doctor consultations organized. Tap the button below to record your next visit."
                      : "Completed and cancelled visits will appear here for your history."}
                  </p>
                </div>
                {activeTab === "upcoming" && (
                  <Button
                    onClick={openAddModal}
                    size="lg"
                    className="font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule a Visit
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {displayedApts.map((apt) => {
                  const isCompleted = apt.status === "completed";
                  const isCancelled = apt.status === "cancelled";
                  return (
                    <div
                      key={apt.id}
                      className={`rounded-3xl border p-6 transition-all bg-white dark:bg-slate-900 flex flex-col justify-between gap-5 ${
                        isCancelled
                          ? "border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50"
                          : isCompleted
                          ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20"
                          : "border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isCompleted
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : isCancelled
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                              }`}
                            >
                              {isCompleted ? "✓ Completed" : isCancelled ? "Cancelled" : "Scheduled"}
                            </span>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                              {apt.title}
                            </h3>
                            {apt.doctor_name && (
                              <p className="text-sm font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                                <User className="h-4 w-4 shrink-0" />
                                {apt.doctor_name}
                              </p>
                            )}
                          </div>

                          {/* Date & Time pill */}
                          <div className="text-right shrink-0 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 justify-end">
                              <Calendar className="h-3.5 w-3.5 text-teal-600" />
                              {formatAppointmentDate(apt.appointment_date)}
                            </div>
                            <div className="text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1 justify-end mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatAppointmentTime(apt.appointment_time)}
                            </div>
                          </div>
                        </div>

                        {/* Location and Notes */}
                        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                          {apt.location && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                              <span>{apt.location}</span>
                            </div>
                          )}

                          {apt.notes && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                              <FileText className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                              <p className="italic leading-relaxed">&ldquo;{apt.notes}&rdquo;</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        {apt.status === "scheduled" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(apt, "completed")}
                              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Mark Done
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(apt, "cancelled")}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-rose-600 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Cancel Visit
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(apt, "scheduled")}
                            className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                          >
                            Re-open Visit
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(apt)}
                            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Appointment"
                            aria-label={`Edit ${apt.title}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(apt)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Appointment"
                            aria-label={`Delete ${apt.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950">
                  <Calendar className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {editingAptId ? "Edit Appointment" : "Schedule New Visit"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="space-y-4">
              {/* Title */}
              <div>
                <label
                  htmlFor="aptTitle"
                  className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                >
                  Visit / Reason for Visit <span className="text-rose-500">*</span>
                </label>
                <input
                  id="aptTitle"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cardiologist Checkup, Eye Test"
                  className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Doctor Name & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="doctorName"
                    className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Doctor Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="doctorName"
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Verma"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Clinic / Hospital <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Max Hospital, Room 302"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="aptDate"
                    className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Appointment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="aptDate"
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="aptTime"
                    className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="aptTime"
                    type="time"
                    required
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="aptNotes"
                  className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                >
                  Doctor Instructions / What to Bring <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="aptNotes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Fasting blood sugar report, previous prescription"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Status (when editing) */}
              {editingAptId && (
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Visit Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="scheduled">Scheduled (Upcoming)</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="flex-1 h-13 text-base font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md cursor-pointer"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingAptId
                    ? "Update Appointment"
                    : "Save Appointment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="h-13 px-5 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950">
              <Trash2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete &ldquo;{deleteTarget.title}&rdquo;?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove this visit record? This action cannot be undone.
              </p>
            </div>
            <div className="pt-2 flex gap-3">
              <Button
                variant="danger"
                onClick={handleDeleteConfirm}
                className="flex-1 h-12 font-bold rounded-xl cursor-pointer"
              >
                Yes, Delete Visit
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-12 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50/70 p-8 text-center text-slate-500 font-bold dark:bg-slate-950">
          Loading Appointments...
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}
