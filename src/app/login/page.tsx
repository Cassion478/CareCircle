"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
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
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// Security: Prevent open redirect vulnerabilities by strictly ensuring relative, internal destinations
function sanitizeRedirectUrl(url: string | null): string {
  if (!url) return "/profile";
  // Must begin with a single slash, not a double slash (protocol-relative), and not contain scheme (:) or backslashes
  if (
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("://") &&
    !url.includes("\\")
  ) {
    return url;
  }
  return "/profile";
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
        setSuccessMessage("Sign in successful! Directing to your personal account...");
        setTimeout(() => {
          router.push(targetDestination);
          router.refresh();
        }, 600);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Return to My Day link */}
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to My Day Dashboard
        </Link>
      </div>

      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Header with App Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md ring-4 ring-teal-600/10">
            <HeartPulse className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Sign In to CareCircle
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            Access your personal healthcare schedule and emergency contacts.
          </p>
        </div>

        {/* Demo Mode / Environment Notification */}
        {!supabaseConfigured && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Demonstration Mode Active</p>
              <p>
                Supabase keys are not set in <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">.env.local</code>. You can explore the full demo experience freely on the dashboard.
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
              <p className="font-bold">Unable to sign in</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div
            role="status"
            className="rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 p-4 text-sm text-teal-800 dark:text-teal-200 flex items-center gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-bold text-slate-800 dark:text-slate-200"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                className="w-full pl-11 pr-4 py-3.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors shadow-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-bold text-slate-800 dark:text-slate-200"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                className="w-full pl-11 pr-12 py-3.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors shadow-xs"
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

          <Button
            type="submit"
            disabled={isLoading}
            size="lg"
            className="w-full h-14 text-base font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In to CareCircle</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>

        {/* Links to Register & Demo */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/register"
              className="font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 underline underline-offset-4"
            >
              Create patient profile
            </Link>
          </p>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              Continue exploring in Demo Mode (Smt. Shanti Devi)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-slate-500 text-sm">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
