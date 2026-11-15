"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  User,
  Phone,
  Calendar,
  Save,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Droplet,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { PatientProfile } from "@/types";

interface ProfileFormProps {
  user: SupabaseUser;
  profile: PatientProfile | null;
  refreshProfile: () => Promise<void>;
}

function ProfileForm({ user, profile, refreshProfile }: ProfileFormProps) {
  const [fullName, setFullName] = useState(
    profile?.fullName || user.user_metadata?.full_name || ""
  );
  const [phoneNumber, setPhoneNumber] = useState(
    profile?.phoneNumber || user.user_metadata?.phone_number || ""
  );
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth || "");
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || "");
  const [allergiesText, setAllergiesText] = useState(
    profile?.allergies ? profile.allergies.join(", ") : ""
  );
  const [emergencyName, setEmergencyName] = useState(
    profile?.emergencyContactName || user.user_metadata?.emergency_contact_name || ""
  );
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    profile?.emergencyContactRelationship || ""
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    profile?.emergencyContactPhone || user.user_metadata?.emergency_contact_phone || ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!fullName.trim()) {
      setErrorMessage("Patient's full name cannot be empty.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      const allergies = allergiesText
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      // Security: Strictly enforce user.id as primary key and owner
      const updates = {
        id: user.id,
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || null,
        date_of_birth: dateOfBirth || null,
        blood_group: bloodGroup || null,
        allergies: allergies.length > 0 ? allergies : [],
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_relationship: emergencyRelationship.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return;
      }

      await refreshProfile();
      setSaveSuccess(true);
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setErrorMessage(msg);
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Feedback Alerts */}
      {saveSuccess && (
        <div
          role="status"
          className="rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 p-4 text-sm text-teal-800 dark:text-teal-200 flex items-center gap-3"
        >
          <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
          <p className="font-bold">Healthcare profile updated successfully!</p>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-4 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-3"
        >
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error saving changes</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Section 1: Patient Identity */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <User className="h-5 w-5 text-teal-600" />
          Patient Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="profileName"
              className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="profileName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label
              htmlFor="profilePhone"
              className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="h-4 w-4" />
              </div>
              <input
                id="profilePhone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-10 pr-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="dob"
              className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Date of Birth
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Calendar className="h-4 w-4" />
              </div>
              <input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="bloodGroup"
              className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Blood Group
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Droplet className="h-4 w-4" />
              </div>
              <select
                id="bloodGroup"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select blood group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="allergies"
            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
          >
            Known Allergies (Comma separated)
          </label>
          <input
            id="allergies"
            type="text"
            value={allergiesText}
            onChange={(e) => setAllergiesText(e.target.value)}
            placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
            className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Keep critical drug allergies updated for safety during emergencies.
          </p>
        </div>
      </div>

      {/* Section 2: Emergency Contact */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-600" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Primary Family Emergency Contact
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This contact is displayed on your senior home screen for one-touch dialing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="contactName"
              className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Contact Name
            </label>
            <input
              id="contactName"
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="e.g. Pooja Sharma"
              className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label
              htmlFor="relationship"
              className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Relationship
            </label>
            <input
              id="relationship"
              type="text"
              value={emergencyRelationship}
              onChange={(e) => setEmergencyRelationship(e.target.value)}
              placeholder="e.g. Daughter / Son / Spouse"
              className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label
              htmlFor="contactPhone"
              className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
            >
              Emergency Phone
            </label>
            <input
              id="contactPhone"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="+91 98201 45678"
              className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex flex-col sm:flex-row gap-3">
        <Button
          type="submit"
          disabled={isSaving}
          size="lg"
          className="h-14 px-8 text-base font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <Save className="h-5 w-5" />
          {isSaving ? "Saving changes..." : "Save Healthcare Profile"}
        </Button>

        <Link href="/" className="inline-block">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-14 px-6 text-base font-bold rounded-xl"
          >
            Go to My Day
          </Button>
        </Link>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading healthcare profile...
        </p>
      </div>
    );
  }

  // Security & Privacy Enforcement: Unauthenticated users are strictly barred from viewing profile data
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:px-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 ring-8 ring-teal-500/10">
            <Lock className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Sign In Required
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Personal healthcare profiles and emergency contacts are confidential. Please sign in to securely access or update your records.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?redirectTo=/profile">
              <Button size="lg" className="w-full sm:w-auto h-13 px-8 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                <span>Sign In to Your Account</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-13 px-6 font-bold rounded-xl">
                Create New Profile
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Public My Day Experience
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentFullName = profile?.fullName || user.user_metadata?.full_name || "";

  // Authenticated Profile Management
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/my-day"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#477A62] hover:text-[#3B6551] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to My Day Dashboard
        </Link>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E3EAE5] shadow-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E3EAE5]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#477A62] text-white font-extrabold text-2xl shadow-md">
              {currentFullName ? currentFullName.slice(0, 2).toUpperCase() : "PT"}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EAF2EC] text-xs font-bold text-[#26352E] border border-[#C8D9CD] mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#477A62]" />
                Active Healthcare Account
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#26352E]">
                {currentFullName || "Patient Profile"}
              </h1>
              <p className="text-xs text-[#66736B]">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <ProfileForm
          key={profile?.updatedAt || user.id}
          user={user}
          profile={profile}
          refreshProfile={refreshProfile}
        />
      </div>
    </div>
  );
}
