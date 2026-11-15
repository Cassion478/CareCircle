"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  HeartPulse,
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Pill,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabaseConfigured = isSupabaseConfigured();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Please provide the patient's full name.");
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email address and a secure password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (!supabaseConfigured) {
      setErrorMessage(
        "Supabase credentials are not configured in .env.local yet. Please configure your project to register real user accounts."
      );
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone_number: phone.trim() || null,
            emergency_contact_name: emergencyContactName.trim() || null,
            emergency_contact_phone: emergencyContactPhone.trim() || null,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        setSuccessMessage("Account created successfully! Preparing your healthcare schedule...");
        setTimeout(() => {
          router.push("/my-day");
          router.refresh();
        }, 800);
      } else if (data.user) {
        setSuccessMessage(
          "Registration successful! If your Supabase project requires email verification, please check your inbox to confirm your account before logging in."
        );
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected registration error occurred.";
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-[#F8FAF8]">
      <div className="w-full max-w-5xl rounded-3xl border border-[#E3EAE5] bg-white shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Visual Reassurance */}
        <div className="lg:col-span-5 relative bg-[#EAF2EC] flex flex-col justify-between p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-[#E3EAE5]">
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <Image
              src="/images/doctor-welcome.jpg"
              alt="Healthcare support"
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#477A62] text-white shadow-sm">
                <HeartPulse className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[#26352E]">
                  CareCircle
                </h2>
                <p className="text-xs font-bold uppercase tracking-wider text-[#477A62]">
                  Healthcare Companion
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-white/80 text-[#26352E] border border-[#C8D9CD]">
                Simple & Thoughtful Registration
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#26352E] leading-tight">
                Join CareCircle Today
              </h3>
              <p className="text-base text-[#4F5D54] leading-relaxed">
                Take control of your daily health with peace of mind. Setting up your profile takes less than two minutes.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-8 space-y-3.5">
            <div className="flex items-center gap-3 text-sm font-semibold text-[#26352E] bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-[#D9E2DC]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF2EC] text-[#477A62] shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span>Private & Secure Health Records</span>
            </div>

            <div className="flex items-center gap-3 text-sm font-semibold text-[#26352E] bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-[#D9E2DC]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF2EC] text-[#477A62] shrink-0">
                <Pill className="h-4 w-4" />
              </div>
              <span>Personalized Medication Times</span>
            </div>

            <div className="flex items-center gap-3 text-sm font-semibold text-[#26352E] bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-[#D9E2DC]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF2EC] text-[#477A62] shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <span>Instant Family Check-Ins</span>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6 bg-white">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#26352E]">
              Create Patient Account
            </h1>
            <p className="text-base text-[#66736B]">
              Enter the patient details below to establish your personalized routine.
            </p>
          </div>

          {!supabaseConfigured && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Demonstration Mode</p>
                <p>
                  Supabase keys are not set in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env.local</code>.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-start gap-3"
            >
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Registration error</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-center gap-3"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="font-bold">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-sm font-bold text-[#26352E]">
                Patient Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66736B]">
                  <User className="h-5 w-5" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Smt. Shanti Devi"
                  className="w-full pl-11 pr-4 py-3 text-base rounded-xl border border-[#D9E2DC] bg-[#F8FAF8] text-[#26352E] placeholder-[#8F9E94] focus:outline-none focus:ring-2 focus:ring-[#477A62] focus:border-[#477A62] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="regEmail" className="block text-sm font-bold text-[#26352E]">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66736B]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="regEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-11 pr-4 py-3 text-base rounded-xl border border-[#D9E2DC] bg-[#F8FAF8] text-[#26352E] placeholder-[#8F9E94] focus:outline-none focus:ring-2 focus:ring-[#477A62] focus:border-[#477A62] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="regPhone" className="block text-sm font-bold text-[#26352E]">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66736B]">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    id="regPhone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 00000"
                    className="w-full pl-11 pr-4 py-3 text-base rounded-xl border border-[#D9E2DC] bg-[#F8FAF8] text-[#26352E] placeholder-[#8F9E94] focus:outline-none focus:ring-2 focus:ring-[#477A62] focus:border-[#477A62] focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="regPassword" className="block text-sm font-bold text-[#26352E]">
                Password * (minimum 6 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66736B]">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="regPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 text-base rounded-xl border border-[#D9E2DC] bg-[#F8FAF8] text-[#26352E] placeholder-[#8F9E94] focus:outline-none focus:ring-2 focus:ring-[#477A62] focus:border-[#477A62] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#66736B] hover:text-[#26352E] min-w-[44px] justify-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Emergency Contact Information */}
            <div className="pt-2 border-t border-[#E3EAE5]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#477A62] mb-2">
                Primary Emergency Contact (Family / Caregiver)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="emName" className="block text-xs font-bold text-[#26352E]">
                    Contact Name
                  </label>
                  <input
                    id="emName"
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g. Pooja Sharma"
                    className="w-full px-4 py-2.5 text-base rounded-xl border border-[#D9E2DC] bg-[#F8FAF8] text-[#26352E] placeholder-[#8F9E94] focus:outline-none focus:ring-2 focus:ring-[#477A62] focus:border-[#477A62] focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emPhone" className="block text-xs font-bold text-[#26352E]">
                    Contact Phone
                  </label>
                  <input
                    id="emPhone"
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="e.g. +91 98201 45678"
                    className="w-full px-4 py-2.5 text-base rounded-xl border border-[#D9E2DC] bg-[#F8FAF8] text-[#26352E] placeholder-[#8F9E94] focus:outline-none focus:ring-2 focus:ring-[#477A62] focus:border-[#477A62] focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="w-full h-14 text-base font-bold bg-[#477A62] hover:bg-[#3B6551] text-white rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {isLoading ? (
                <span>Creating profile...</span>
              ) : (
                <>
                  <span>Create Patient Profile</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center">
            <p className="text-sm text-[#66736B]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-[#477A62] hover:text-[#3B6551] hover:underline underline-offset-4"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
