"use client";

import { useState } from "react";
import Link from "next/link";
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
  ArrowLeft,
  Sparkles,
  ShieldCheck,
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

      // Check if session is established or if email confirmation is required
      if (data.session) {
        setSuccessMessage("Account created successfully! Preparing your healthcare profile...");
        setTimeout(() => {
          router.push("/profile");
          router.refresh();
        }, 1000);
      } else if (data.user) {
        setSuccessMessage(
          "Registration successful! If your Supabase project requires email verification, please check your inbox to confirm your account before logging in."
        );
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Return to My Day link */}
      <div className="w-full max-w-lg mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to My Day Dashboard
        </Link>
      </div>

      <div className="w-full max-w-lg space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md ring-4 ring-teal-600/10">
            <HeartPulse className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Create Patient Profile
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Start a personalized, accessible healthcare routine with CareCircle.
          </p>
        </div>

        {/* Demo Mode Notice */}
        {!supabaseConfigured && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Supabase Configuration Required</p>
              <p>
                To save real accounts, enter your project details in <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">.env.local</code>. You can also explore the pre-configured demo account anytime.
              </p>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-4 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-3"
          >
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Registration could not be completed</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div
            role="status"
            className="rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 p-4 text-sm text-teal-800 dark:text-teal-200 flex items-start gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Success</p>
              <p className="mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          {/* Section: Basic Identity */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
              >
                Patient&apos;s Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Smt. Shanti Devi"
                  className="w-full pl-11 pr-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
              >
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full pl-11 pr-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
              >
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-11 pr-12 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1"
              >
                Patient&apos;s Phone Number <span className="text-xs font-normal text-slate-500">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-11 pr-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section: Emergency Contact */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Primary Family / Emergency Contact
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This contact will appear prominently on the senior&apos;s routine screen for immediate one-tap assistance.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="emergencyName"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Contact Name
                </label>
                <input
                  id="emergencyName"
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="e.g. Pooja Sharma (Daughter)"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                />
              </div>
              <div>
                <label
                  htmlFor="emergencyPhone"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Contact Phone
                </label>
                <input
                  id="emergencyPhone"
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="+91 98201 45678"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            size="lg"
            className="w-full h-14 text-base font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span>Creating profile...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>

        {/* Links */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 underline underline-offset-4"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
