"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Phone,
  Mail,
  HeartHandshake,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { DbCareCircleMember, CareCircleMemberRole, CareCircleMemberStatus } from "@/types";
import {
  validateCareCircleMember,
  getAvatarInitials,
  COMMON_RELATIONSHIPS,
} from "@/lib/care-circle";
import { DEMO_CAREGIVERS } from "@/lib/demo-data";

function CareCircleContent() {
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<DbCareCircleMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [relationship, setRelationship] = useState("Daughter");
  const [customRelationship, setCustomRelationship] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CareCircleMemberRole>("caregiver");
  const [status, setStatus] = useState<CareCircleMemberStatus>("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<DbCareCircleMember | null>(null);

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
        .from("care_circle_members")
        .select("*")
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setMembers(data || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Care Circle members.";
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
    setEditingMemberId(null);
    setMemberName("");
    setRelationship("Daughter");
    setCustomRelationship("");
    setPhoneNumber("");
    setEmail("");
    setRole("caregiver");
    setStatus("active");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: DbCareCircleMember) => {
    setEditingMemberId(m.id);
    setMemberName(m.member_name);
    if (COMMON_RELATIONSHIPS.includes(m.relationship)) {
      setRelationship(m.relationship);
      setCustomRelationship("");
    } else {
      setRelationship("Other Trusted Contact");
      setCustomRelationship(m.relationship);
    }
    setPhoneNumber(m.phone_number || "");
    setEmail(m.email || "");
    setRole(m.role);
    setStatus(m.status);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalRelationship =
      relationship === "Other Trusted Contact" && customRelationship.trim()
        ? customRelationship.trim()
        : relationship;

    const validation = validateCareCircleMember({
      memberName,
      relationship: finalRelationship,
      phoneNumber: phoneNumber || null,
      email: email || null,
      role,
      status,
    });

    if (!validation.isValid) {
      setErrorMessage(validation.error || "Please verify the contact details.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const payload = {
        patient_id: user.id,
        member_name: memberName.trim(),
        relationship: finalRelationship,
        phone_number: phoneNumber.trim() || null,
        email: email.trim() || null,
        role,
        status,
        updated_at: new Date().toISOString(),
      };

      if (editingMemberId) {
        const { error } = await supabase
          .from("care_circle_members")
          .update(payload)
          .eq("id", editingMemberId)
          .eq("patient_id", user.id);

        if (error) throw error;
        showSuccess(`Updated ${memberName}'s details.`);
      } else {
        const { error } = await supabase.from("care_circle_members").insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
        showSuccess(`Added ${memberName} to your Care Circle.`);
      }

      setIsModalOpen(false);
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save contact.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!user || !deleteTarget) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("care_circle_members")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("patient_id", user.id);

      if (error) throw error;
      showSuccess(`Removed ${deleteTarget.member_name} from your Care Circle.`);
      setDeleteTarget(null);
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove contact.";
      setErrorMessage(msg);
    }
  };

  const handleToggleRevokeStatus = async (m: DbCareCircleMember) => {
    if (!user) return;
    try {
      const supabase = createClient();
      const nextStatus: CareCircleMemberStatus = m.status === "active" ? "revoked" : "active";
      const { error } = await supabase
        .from("care_circle_members")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", m.id)
        .eq("patient_id", user.id);

      if (error) throw error;
      showSuccess(
        `${m.member_name} is now marked as ${nextStatus === "active" ? "Active" : "Revoked"}.`
      );
      await loadData(user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update member status.";
      setErrorMessage(msg);
    }
  };

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
              Family Network
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        {/* Title & Action Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-[#E3EAE5] shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#477A62] uppercase tracking-wider">
              <Users className="h-4 w-4" />
              Trusted Family Network
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#26352E]">
              My Family Care Circle
            </h1>
            <p className="text-base text-[#66736B]">
              Keep your trusted loved ones and emergency helpers close by.
            </p>
          </div>

          {user && (
            <Button
              onClick={openAddModal}
              size="lg"
              className="h-13 px-6 text-base font-bold bg-[#477A62] hover:bg-[#3B6551] text-white rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span>Add Family Member</span>
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

        {/* Unauthenticated Demo Notice */}
        {!user && !authLoading && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
              <div>
                <h2 className="text-base font-bold text-amber-900 dark:text-amber-200">
                  Preview Demonstration Mode
                </h2>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  You are previewing sample family contacts for Smt. Shanti Devi. Sign in to your
                  patient account to manage and save your real Care Circle.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-500 transition-colors shadow-sm"
            >
              Sign In to Save
            </Link>
          </div>
        )}

        {/* Honest Privacy & Access Disclosure */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
          <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Patient Control & Privacy Assurance
            </p>
            <p>
              You maintain 100% control over who appears in your Care Circle. Adding a family contact
              records their phone and assistance details in your personal companion app for quick
              access and emergency dialing. It does not automatically grant external database access
              or share confidential clinical records.
            </p>
          </div>
        </div>

        {/* Content Section: Authenticated vs Demo */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              Loading your trusted family network...
            </p>
          </div>
        ) : user ? (
          <div>
            {members.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 sm:p-14 text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600">
                  <Users className="h-8 w-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    No family members added yet
                  </h3>
                  <p className="text-sm text-slate-500">
                    Add your daughter, son, spouse, or trusted neighbor so they can be contacted
                    quickly for daily support.
                  </p>
                </div>
                <Button
                  onClick={openAddModal}
                  size="lg"
                  className="font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Contact
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {members.map((m) => {
                  const isRevoked = m.status === "revoked";
                  return (
                    <div
                      key={m.id}
                      className={`rounded-3xl border p-6 transition-all bg-white dark:bg-slate-900 flex flex-col justify-between gap-5 ${
                        isRevoked
                          ? "border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50"
                          : "border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl font-black text-lg ${
                                m.role === "emergency_contact"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                                  : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                              }`}
                            >
                              {getAvatarInitials(m.member_name)}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                {m.member_name}
                              </h3>
                              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mt-0.5">
                                {m.relationship}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="secondary"
                              className={`text-[11px] font-bold ${
                                m.role === "emergency_contact"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-teal-50 text-teal-700 border-teal-200"
                              }`}
                            >
                              {m.role === "emergency_contact" ? "Emergency" : "Caregiver"}
                            </Badge>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : m.status === "pending"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {m.status === "active"
                                ? "Active"
                                : m.status === "pending"
                                ? "Pending"
                                : "Revoked"}
                            </span>
                          </div>
                        </div>

                        {/* Contact Details */}
                        <div className="space-y-2 pt-1 text-sm text-slate-700 dark:text-slate-300">
                          {m.phone_number ? (
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                                <Phone className="h-4 w-4 text-teal-600" />
                                {m.phone_number}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${m.phone_number}`}
                                  className="h-8 px-2.5 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center gap-1 hover:bg-teal-500 transition-colors"
                                  aria-label={`Call ${m.member_name}`}
                                >
                                  Call
                                </a>
                                <a
                                  href={`sms:${m.phone_number}`}
                                  className="h-8 px-2.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1 hover:bg-slate-300 transition-colors"
                                  aria-label={`SMS ${m.member_name}`}
                                >
                                  SMS
                                </a>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No phone number recorded</p>
                          )}

                          {m.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 truncate">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{m.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleRevokeStatus(m)}
                          className={`text-xs font-bold underline transition-colors cursor-pointer ${
                            m.status === "active"
                              ? "text-slate-500 hover:text-amber-600"
                              : "text-teal-600 hover:text-teal-700"
                          }`}
                        >
                          {m.status === "active" ? "Revoke Access" : "Re-activate"}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(m)}
                            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Contact"
                            aria-label={`Edit ${m.member_name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(m)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove Contact"
                            aria-label={`Delete ${m.member_name}`}
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
        ) : (
          /* Demo Fallback Cards for Visitors */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DEMO_CAREGIVERS.map((cg) => (
              <div
                key={cg.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 font-black text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                      {cg.avatarInitials}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{cg.name}</h3>
                      <p className="text-xs text-slate-500">
                        {cg.relationship} • {cg.role}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Demo
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-teal-600" />
                    <span>{cg.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-teal-600" />
                    <span>{cg.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950">
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {editingMemberId ? "Edit Family Member" : "Add Family Member"}
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

            <form onSubmit={handleSaveMember} className="space-y-4">
              {/* Member Name */}
              <div>
                <label
                  htmlFor="memberName"
                  className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                >
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="memberName"
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. Pooja Sharma"
                  className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Relationship */}
              <div>
                <label
                  htmlFor="relationship"
                  className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                >
                  Relationship to You <span className="text-rose-500">*</span>
                </label>
                <select
                  id="relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {COMMON_RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              {relationship === "Other Trusted Contact" && (
                <div>
                  <label
                    htmlFor="customRelationship"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Describe Relationship
                  </label>
                  <input
                    id="customRelationship"
                    type="text"
                    value={customRelationship}
                    onChange={(e) => setCustomRelationship(e.target.value)}
                    placeholder="e.g. Niece, Lifelong Friend"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98201 45678"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pooja@example.com"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Member Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("caregiver")}
                    className={`p-3.5 rounded-xl border text-left font-bold text-sm transition-all cursor-pointer ${
                      role === "caregiver"
                        ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200 ring-2 ring-teal-500/20"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <HeartHandshake className="h-4 w-4 mb-1 text-teal-600" />
                    <div>Caregiver</div>
                    <div className="text-[11px] font-normal opacity-75">
                      Family support helper
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("emergency_contact")}
                    className={`p-3.5 rounded-xl border text-left font-bold text-sm transition-all cursor-pointer ${
                      role === "emergency_contact"
                        ? "border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200 ring-2 ring-rose-500/20"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4 mb-1 text-rose-600" />
                    <div>Emergency Contact</div>
                    <div className="text-[11px] font-normal opacity-75">
                      First call in emergencies
                    </div>
                  </button>
                </div>
              </div>

              {/* Status (when editing) */}
              {editingMemberId && (
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Contact Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CareCircleMemberStatus)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="active">Active (Visible on Dashboard)</option>
                    <option value="pending">Pending</option>
                    <option value="revoked">Revoked (Access Suspended)</option>
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
                  {isSubmitting ? "Saving..." : editingMemberId ? "Update Contact" : "Add to Circle"}
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

      {/* Delete / Revoke Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950">
              <Trash2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Remove {deleteTarget.member_name}?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove this family member from your Care Circle? You can
                always add them back later.
              </p>
            </div>
            <div className="pt-2 flex gap-3">
              <Button
                variant="danger"
                onClick={handleRevokeConfirm}
                className="flex-1 h-12 font-bold rounded-xl cursor-pointer"
              >
                Yes, Remove Contact
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

export default function CareCirclePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50/70 p-8 text-center text-slate-500 font-bold dark:bg-slate-950">
          Loading Family Care Circle...
        </div>
      }
    >
      <CareCircleContent />
    </Suspense>
  );
}
