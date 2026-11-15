import Link from "next/link";
import { HeartPulse } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#E3EAE5] bg-white py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#477A62] text-white">
              <HeartPulse className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold text-[#26352E]">CareCircle</span>
            <span className="text-xs text-[#66736B]">•</span>
            <span className="text-xs font-semibold text-[#477A62]">
              &ldquo;Your Health. Your Independence. Our Care.&rdquo;
            </span>
          </div>

          <p className="text-xs font-semibold text-[#66736B]">
            © 2026 CareCircle. Thoughtful Healthcare Companion for Seniors & Families.
          </p>
          <p className="text-[11px] text-[#8F9E94] max-w-2xl leading-relaxed">
            CareCircle is an independent daily routine companion and demonstration platform. All medication names, schedules, and emergency helplines are for illustrative purposes and do not substitute professional medical advice. Always consult a certified physician.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5 text-xs text-[#66736B] shrink-0 text-center sm:text-right">
          <div className="flex items-center gap-4 font-semibold">
            <Link href="/my-day" className="hover:text-[#26352E] hover:underline">
              My Day
            </Link>
            <span>•</span>
            <Link href="/analytics" className="hover:text-[#26352E] hover:underline">
              Analytics
            </Link>
            <span>•</span>
            <Link href="/caregiver" className="hover:text-[#26352E] hover:underline">
              Family Portal
            </Link>
          </div>
          <p className="text-[11px] text-[#8F9E94]">
            Elderly-First Accessible Web Application
          </p>
        </div>
      </div>
    </footer>
  );
}
