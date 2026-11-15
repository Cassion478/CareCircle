"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Clock,
  Calendar,
  Pill,
  HeartHandshake,
  AlertCircle,
  ArrowLeft,
  X,
  Phone,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import {
  DbAlert,
  DbAlertPreferences,
  DbCareCircleMember,
  AlertType,
  AlertStatus,
  EscalationStatus,
} from "@/types";
import {
  formatAlertTime,
} from "@/lib/alerts";

function AlertsContent() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<DbAlert[]>([]);
  const [, setPreferences] = useState<DbAlertPreferences | null>(null);
  const [careCircleMembers, setCareCircleMembers] = useState<DbCareCircleMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [tab, setTab] = useState<"active" | "all" | "history">("active");
  const [typeFilter, setTypeFilter] = useState<"all" | AlertType>("all");

  // Assistance Request Modal
  const [isAssistModalOpen, setIsAssistModalOpen] = useState(false);
  const [assistTitle, setAssistTitle] = useState("");
  const [assistNotes, setAssistNotes] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [shouldEscalate, setShouldEscalate] = useState(true);
  const [isSubmittingAssist, setIsSubmittingAssist] = useState(false);

  // Preferences Modal
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [medReminders, setMedReminders] = useState(true);
  const [aptReminders, setAptReminders] = useState(true);
  const [assistEscalation, setAssistEscalation] = useState(true);
  const [preferredContactId, setPreferredContactId] = useState<string>("");
  const [isSavingPref, setIsSavingPref] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const loadData = useCallback(async (userId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();

      // 1. Fetch alerts
      const { data: alertsData, error: alertsErr } = await supabase
        .from("alerts")
        .select("*")
        .eq("patient_id", userId)
        .order("scheduled_for", { ascending: false });

      if (alertsErr) {
        setErrorMessage(alertsErr.message);
      } else {
        setAlerts(alertsData || []);
      }

      // 2. Fetch preferences
      const { data: prefData } = await supabase
        .from("alert_preferences")
        .select("*")
        .eq("patient_id", userId)
        .maybeSingle();

      if (prefData) {
        setPreferences(prefData);
        setMedReminders(prefData.medication_reminders);
        setAptReminders(prefData.appointment_reminders);
        setAssistEscalation(prefData.assistance_escalation_enabled);
        setPreferredContactId(prefData.preferred_care_circle_contact_id || "");
      }

      // 3. Fetch active Care Circle contacts
      const { data: contactsData } = await supabase
        .from("care_circle_members")
        .select("*")
        .eq("patient_id", userId)
        .eq("status", "active");

      if (contactsData) {
        setCareCircleMembers(contactsData);
        if (!selectedContactId && contactsData.length > 0) {
          setSelectedContactId(contactsData[0].id);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load alerts.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedContactId]);

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      await Promise.resolve();
      if (isCancelled) return;

      if (user) {
        await loadData(user.id);
      } else {
        setAlerts([]);
        setIsLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [user, loadData]);

  // Acknowledge alert
  const handleAcknowledge = async (alertId: string) => {
    if (!user) {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: "acknowledged",
                acknowledged_at: new Date().toISOString(),
              }
            : a
        )
      );
      showSuccess("Alert acknowledged.");
      return;
    }

    try {
      const supabase = createClient();
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("alerts")
        .update({
          status: "acknowledged",
          acknowledged_at: nowIso,
        })
        .eq("id", alertId)
        .eq("patient_id", user.id);

      if (error) throw error;
      showSuccess("Alert marked as acknowledged.");
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to acknowledge alert.";
      setErrorMessage(msg);
    }
  };

  // Snooze alert (10 minutes)
  const handleSnooze = async (alertId: string) => {
    const snoozedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    if (!user) {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: "snoozed",
                snoozed_until: snoozedUntil,
              }
            : a
        )
      );
      showSuccess("Alert snoozed for 10 minutes.");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("alerts")
        .update({
          status: "snoozed",
          snoozed_until: snoozedUntil,
        })
        .eq("id", alertId)
        .eq("patient_id", user.id);

      if (error) throw error;
      showSuccess("Alert snoozed for 10 minutes.");
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to snooze alert.";
      setErrorMessage(msg);
    }
  };

  // Resolve or cancel assistance request
  const handleResolveAssistance = async (alertId: string, cancel = false) => {
    const newStatus: AlertStatus = cancel ? "cancelled" : "resolved";
    const newEsc: EscalationStatus = cancel ? "cancelled" : "not_required";

    if (!user) {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: newStatus,
                escalation_status: newEsc,
              }
            : a
        )
      );
      showSuccess(cancel ? "Request cancelled." : "Request marked resolved.");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("alerts")
        .update({
          status: newStatus,
          escalation_status: newEsc,
        })
        .eq("id", alertId)
        .eq("patient_id", user.id);

      if (error) throw error;
      showSuccess(cancel ? "Request cancelled." : "Request marked resolved.");
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update request.";
      setErrorMessage(msg);
    }
  };

  // Submit new Assistance Request
  const handleSubmitAssistance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistTitle.trim()) {
      setErrorMessage("Please select or describe the type of help needed.");
      return;
    }

    setIsSubmittingAssist(true);
    setErrorMessage(null);

    const contact = careCircleMembers.find((c) => c.id === selectedContactId);
    const escalationStatus: EscalationStatus = shouldEscalate ? "waiting" : "not_required";
    const nowIso = new Date().toISOString();

    if (!user) {
      setIsSubmittingAssist(false);
      setIsAssistModalOpen(false);
      setErrorMessage("Please sign in to submit an assistance request.");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from("alerts").insert({
        patient_id: user.id,
        type: "assistance",
        title: `Assistance Request: ${assistTitle.trim()}`,
        message: `${assistNotes.trim() || "Assistance requested by patient."}${
          contact ? ` Preferred Contact: ${contact.member_name}${contact.phone_number ? ` (${contact.phone_number})` : ""}.` : ""
        }`,
        related_medication_id: null,
        related_appointment_id: null,
        scheduled_for: nowIso,
        status: "pending",
        acknowledged_at: null,
        snoozed_until: null,
        escalation_status: escalationStatus,
      });

      if (error) throw error;

      setIsAssistModalOpen(false);
      setAssistTitle("");
      setAssistNotes("");
      showSuccess("Assistance request recorded in your CareCircle log.");
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record assistance request.";
      setErrorMessage(msg);
    } finally {
      setIsSubmittingAssist(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsPrefModalOpen(false);
      showSuccess("Preferences saved.");
      return;
    }

    setIsSavingPref(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const payload = {
        patient_id: user.id,
        medication_reminders: medReminders,
        appointment_reminders: aptReminders,
        assistance_escalation_enabled: assistEscalation,
        preferred_care_circle_contact_id: preferredContactId || null,
      };

      const { error } = await supabase.from("alert_preferences").upsert(payload, {
        onConflict: "patient_id",
      });

      if (error) throw error;
      setIsPrefModalOpen(false);
      showSuccess("Alert preferences updated.");
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save preferences.";
      setErrorMessage(msg);
    } finally {
      setIsSavingPref(false);
    }
  };

  // Filter alerts by tab and type
  const filteredAlerts = alerts.filter((a) => {
    // Type filter
    if (typeFilter !== "all" && a.type !== typeFilter) return false;

    // Tab filter
    if (tab === "active") {
      return a.status === "pending" || a.status === "snoozed";
    }
    if (tab === "history") {
      return a.status === "acknowledged" || a.status === "resolved" || a.status === "cancelled";
    }
    return true; // 'all'
  });

  const pendingCount = alerts.filter((a) => a.status === "pending" || a.status === "snoozed").length;

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
              Alerts & Notifications
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        {/* Title & Action Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#E3EAE5] shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#477A62] uppercase tracking-wider">
              <Bell className="h-4 w-4" />
              Proactive Health Notifications
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#26352E]">
              Alerts & Assistance Centre
            </h1>
            <p className="text-base text-[#66736B]">
              Timely reminders for medications and clinic visits, with a direct patient assistance workflow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsPrefModalOpen(true)}
              className="h-12 px-4 rounded-2xl font-bold flex items-center gap-2 border-[#D9E2DC] text-[#26352E] hover:bg-[#EAF2EC] cursor-pointer"
            >
              <Settings className="h-4 w-4 text-[#477A62]" />
              <span>Preferences</span>
            </Button>
            <Button
              onClick={() => setIsAssistModalOpen(true)}
              className="h-12 px-6 rounded-2xl font-bold flex items-center gap-2 bg-[#477A62] hover:bg-[#3B6551] text-white shadow-md cursor-pointer"
            >
              <HeartHandshake className="h-5 w-5" />
              <span>Request Assistance</span>
            </Button>
          </div>
        </div>

        {/* Toast Notification */}
        {successMessage && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-sm font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Transparent Communication Disclosure Banner */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/60 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Honest Communication Notice:
            </span>{" "}
            All alerts and assistance requests in CareCircle are in-app tracking records. CareCircle does <strong>not</strong> send external SMS, push notifications, or dispatch emergency rescue. For urgent emergencies, always dial <strong>112</strong> or call your caregiver directly.
          </div>
        </div>

        {/* Tabs & Type Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          {/* Main Status Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("active")}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                tab === "active"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              <span>Pending & Active</span>
              {pendingCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-black text-white">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("history")}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                tab === "history"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              Acknowledged & Resolved
            </button>
            <button
              onClick={() => setTab("all")}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                tab === "all"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              All Alerts
            </button>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 pr-1">Type:</span>
            {(["all", "medication", "appointment", "assistance"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  typeFilter === t
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {t === "all" ? "All Types" : `${t}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 font-bold">
            Loading your alerts & reminders...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-700 dark:text-teal-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {tab === "active" ? "All Caught Up!" : "No Alerts Found"}
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {tab === "active"
                  ? "You have no active pending reminders or assistance requests. Everything is on schedule."
                  : "No alerts match the selected filters."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAlerts.map((alert) => {
              const isApt = alert.type === "appointment";
              const isAssist = alert.type === "assistance";
              const isPending = alert.status === "pending";
              const isSnoozed = alert.status === "snoozed";

              return (
                <div
                  key={alert.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border p-6 sm:p-7 transition-all shadow-sm ${
                    isAssist
                      ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/20"
                      : isPending
                      ? "border-teal-300 dark:border-teal-800"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Icon & Title Info */}
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center ${
                          isAssist
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            : isApt
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                        }`}
                      >
                        {isAssist ? (
                          <HeartHandshake className="h-6 w-6" />
                        ) : isApt ? (
                          <Calendar className="h-6 w-6" />
                        ) : (
                          <Pill className="h-6 w-6" />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black text-slate-900 dark:text-white">
                            {alert.title}
                          </h2>
                          <Badge
                            variant={
                              isPending
                                ? "danger"
                                : isSnoozed
                                ? "warning"
                                : alert.status === "acknowledged" || alert.status === "resolved"
                                ? "success"
                                : "secondary"
                            }
                            className="capitalize"
                          >
                            {alert.status}
                          </Badge>
                          {alert.escalation_status === "waiting" && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300">
                              Awaiting Caregiver Follow-Up
                            </span>
                          )}
                          {alert.escalation_status === "escalated" && (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300">
                              Escalated Request
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                          {alert.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            Scheduled: {formatAlertTime(alert.scheduled_for)}
                          </span>
                          {alert.acknowledged_at && (
                            <span>
                              Acknowledged: {formatAlertTime(alert.acknowledged_at)}
                            </span>
                          )}
                          {isSnoozed && alert.snoozed_until && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              Snoozed until: {formatAlertTime(alert.snoozed_until)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 shrink-0">
                      {(isPending || isSnoozed) && (
                        <>
                          <Button
                            variant="primary"
                            onClick={() => handleAcknowledge(alert.id)}
                            className="h-10 px-4 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Acknowledge</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleSnooze(alert.id)}
                            className="h-10 px-3.5 rounded-xl font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <Clock className="h-4 w-4" />
                            <span>Snooze 10m</span>
                          </Button>
                        </>
                      )}

                      {isAssist && (alert.status === "pending" || alert.status === "acknowledged") && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleResolveAssistance(alert.id, false)}
                            className="h-10 px-3.5 rounded-xl font-bold text-teal-700 dark:text-teal-300 cursor-pointer"
                          >
                            Mark Resolved
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleResolveAssistance(alert.id, true)}
                            className="h-10 px-3.5 rounded-xl font-bold cursor-pointer"
                          >
                            Cancel Request
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assistance Request Modal */}
      {isAssistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-rose-600" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Request Assistance
                </h3>
              </div>
              <button
                onClick={() => setIsAssistModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssistance} className="space-y-4">
              {/* Common Needs Quick Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  What do you need help with?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Medication Dosage & Confusion",
                    "Feeling Unwell / Dizzy",
                    "Need Ride to Doctor Visit",
                    "Pharmacy Refill Needed",
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setAssistTitle(preset)}
                      className={`p-2.5 text-xs font-bold text-left rounded-xl border transition-all cursor-pointer ${
                        assistTitle === preset
                          ? "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Or enter specific description:
                </label>
                <input
                  type="text"
                  value={assistTitle}
                  onChange={(e) => setAssistTitle(e.target.value)}
                  placeholder="e.g. Need assistance with morning eye drops"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              {/* Preferred Contact Selection */}
              {careCircleMembers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Notify Care Circle Contact (In-App):
                  </label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                  >
                    {careCircleMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.member_name} ({member.relationship} - {member.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Additional Notes (Optional):
                </label>
                <textarea
                  value={assistNotes}
                  onChange={(e) => setAssistNotes(e.target.value)}
                  placeholder="Add any specific details or urgency..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Escalation Toggle */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="shouldEscalate"
                  checked={shouldEscalate}
                  onChange={(e) => setShouldEscalate(e.target.checked)}
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="shouldEscalate" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Mark status as &ldquo;Awaiting Caregiver Follow-Up&rdquo; (In-App Escalation)
                </label>
              </div>

              {/* Direct Calling Link */}
              {careCircleMembers.find((c) => c.id === selectedContactId)?.phone_number && (
                <div className="pt-1 flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-bold">
                  <span>Need urgent assistance? Call now:</span>
                  <a
                    href={`tel:${careCircleMembers.find((c) => c.id === selectedContactId)?.phone_number}`}
                    className="inline-flex items-center gap-1 underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Direct Dial Contact
                  </a>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <Button
                  type="submit"
                  disabled={isSubmittingAssist}
                  className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  {isSubmittingAssist ? "Recording..." : "Record Assistance Request"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssistModalOpen(false)}
                  className="h-12 px-5 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {isPrefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-teal-700" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Alert Preferences
                </h3>
              </div>
              <button
                onClick={() => setIsPrefModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 cursor-pointer">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Medication Reminder Alerts
                  </span>
                  <input
                    type="checkbox"
                    checked={medReminders}
                    onChange={(e) => setMedReminders(e.target.checked)}
                    className="h-5 w-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 cursor-pointer">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Appointment Reminder Alerts
                  </span>
                  <input
                    type="checkbox"
                    checked={aptReminders}
                    onChange={(e) => setAptReminders(e.target.checked)}
                    className="h-5 w-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 cursor-pointer">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    In-App Assistance Escalation Workflow
                  </span>
                  <input
                    type="checkbox"
                    checked={assistEscalation}
                    onChange={(e) => setAssistEscalation(e.target.checked)}
                    className="h-5 w-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>
              </div>

              {careCircleMembers.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Default Preferred Care Circle Contact:
                  </label>
                  <select
                    value={preferredContactId}
                    onChange={(e) => setPreferredContactId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="">None (Select at time of request)</option>
                    {careCircleMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.member_name} ({m.relationship})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <Button
                  type="submit"
                  disabled={isSavingPref}
                  className="flex-1 h-12 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  {isSavingPref ? "Saving..." : "Save Preferences"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPrefModalOpen(false)}
                  className="h-12 px-5 font-bold rounded-xl cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50/70 p-8 text-center text-slate-500 font-bold dark:bg-slate-950">
          Loading Alerts & Assistance Centre...
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}
