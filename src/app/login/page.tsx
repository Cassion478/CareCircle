"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Calendar,
  Pill,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// Security: Prevent open redirect vulnerabilities by strictly ensuring relative, internal destinations
function sanitizeRedirectUrl(url: string | null): string {
  if (!url) return "/my-day";
  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("://") &&
    !url.includes("\\")
  ) {
    return url;
  }
  return "/my-day";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirectTo = searchParams.get("redirectTo");
  const targetDestination = sanitizeRedirectUrl(rawRedirectTo);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabaseConfigured = isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    if (!supabaseConfigured) {
      setErrorMessage(
        "Supabase credentials are not configured in .env.local yet. Please configure your project URL and publishable key to sign in."
      );
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          setErrorMessage(
            "Incorrect email or password. Please verify your details or register for a new account."
          );
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMessage(
            "Your email address has not been confirmed yet. Please check your email inbox for the confirmation link."
          );
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.session) {
        setSuccessMessage("Sign in successful! Opening your My Day routine...");
        setTimeout(() => {
          router.push(targetDestination);
          router.refresh();
        }, 500);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-[#F8FAF8]">
      <div className="w-full max-w-5xl rounded-3xl border border-[#E3EAE5] bg-white shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Welcoming Healthcare Visual & Reassurance */}
        <div className="lg:col-span-5 relative bg-[#EAF2EC] flex flex-col justify-between p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-[#E3EAE5]">
          {/* Background Image with Gentle Overlay */}
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <Image
              src="/images/doctor-welcome.jpg"
              alt="Welcoming doctor and patient"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Top Branding Content */}
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
                Senior Wellness & Peace of Mind
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#26352E] leading-tight">
                Your Health. Your Independence. Our Care.
              </h3>
              <p className="text-base text-[#4F5D54] leading-relaxed">
                A simple, reassuring healthcare companion designed to help seniors take their daily medicines on time, keep doctor appointments, and stay connected with family.
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="relative z-10 pt-8 space-y-3.5">
            <div className="flex items-center gap-3 text-sm font-semibold text-[#26352E] bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-[#D9E2DC]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF2EC] text-[#477A62] shrink-0">
                <Pill className="h-4 w-4" />
              </div>
              <span>Clear Daily Medication Routine</span>
            </div>

            <div className="flex items-center gap-3 text-sm font-semibold text-[#26352E] bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-[#D9E2DC]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF2EC] text-[#477A62] shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <span>Doctor Appointment Reminders</span>
            </div>

            <div className="flex items-center gap-3 text-sm font-semibold text-[#26352E] bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-[#D9E2DC]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF2EC] text-[#477A62] shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <span>Trusted Family Care Circle</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Accessible Sign In Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-8 bg-white">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#26352E]">
              Welcome to CareCircle
            </h1>
            <p className="text-base text-[#66736B]">
              Sign in with your email to see your personal daily schedule.
            </p>
          </div>

          {/* Demo Mode Notice */}
          {!supabaseConfigured && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Demonstration Mode</p>
                <p>
                  Supabase keys are not set in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env.local</code>. You can explore the full demo experience freely.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-start gap-3"
            >
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Unable to sign in</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div
              role="status"
              className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-center gap-3"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="font-bold">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-base font-bold text-[#26352E]"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66736B]">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3.5 text-base rounded-xl border border-[#D9E2DC] bg-[#F8FAF8] text-[#26352E] placeholder-[#8F9E94] focus:outline-none focus:ring-2 focus:ring-[#477A62] focus:border-[#477A62] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-base font-bold text-[#26352E]"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66736B]">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 text-base rounded-xl border border-[#D9E2DC] bg-[#F8FAF8] text-[#26352E] placeholder-[#8F9E94] focus:outline-none focus:ring-2 focus:ring-[#477A62] focus:border-[#477A62] focus:bg-white transition-colors"
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

            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="w-full h-14 text-base font-bold bg-[#477A62] hover:bg-[#3B6551] text-white rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to My Day</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Links & Alternate Navigation */}
          <div className="pt-4 border-t border-[#E3EAE5] space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <span className="text-[#66736B]">New patient or family?</span>
              <Link
                href="/register"
                className="font-bold text-[#477A62] hover:text-[#3B6551] hover:underline underline-offset-4"
              >
                Create new patient profile
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm pt-2">
              <Link
                href="/caregiver"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#477A62] hover:text-[#3B6551] hover:underline"
              >
                <ShieldCheck className="h-4 w-4" />
                Caregiver or family member? Open Family Portal
              </Link>

              <Link
                href="/my-day"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66736B] hover:text-[#26352E] hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Explore Demo Mode (Smt. Shanti Devi)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[85vh] flex items-center justify-center text-[#66736B] text-base">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
