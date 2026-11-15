"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HeartPulse,
  Bell,
  Calendar,
  Pill,
  Users,
  SunMedium,
  ShieldCheck,
  User,
  LogIn,
  LogOut,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarInitials } from "@/lib/care-circle";

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = profile?.fullName || user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : null);
  const initials = displayName ? getAvatarInitials(displayName) : "CC";

  const navLinks = [
    { href: "/my-day", label: "My Day", icon: SunMedium, matchPrefix: ["/my-day"] },
    { href: "/medications", label: "Medications", icon: Pill, matchPrefix: ["/medications"] },
    { href: "/appointments", label: "Appointments", icon: Calendar, matchPrefix: ["/appointments"] },
    { href: "/care-circle", label: "Care Circle", icon: Users, matchPrefix: ["/care-circle"] },
    { href: "/alerts", label: "Alerts", icon: Bell, matchPrefix: ["/alerts"] },
    { href: "/analytics", label: "Analytics", icon: BarChart3, matchPrefix: ["/analytics"] },
    { href: "/caregiver", label: "Family Portal", icon: ShieldCheck, matchPrefix: ["/caregiver"] },
  ];

  const isActive = (item: { href: string; matchPrefix: string[] }) => {
    if (pathname === item.href) return true;
    return item.matchPrefix.some((prefix) => pathname.startsWith(prefix));
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E3EAE5] bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-4 lg:gap-8">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#26352E] hover:bg-[#EAF2EC] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#477A62] text-white shadow-sm ring-2 ring-[#477A62]/20">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-[#26352E]">
                CareCircle
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#477A62]">
                Healthcare Companion
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 text-sm font-semibold">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                    active
                      ? "bg-[#EAF2EC] text-[#26352E]"
                      : "text-[#66736B] hover:text-[#26352E] hover:bg-[#F8FAF8]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-[#477A62]" : "text-[#66736B]"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Status Pill, Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Wellness Badge */}
          <div className="hidden xl:inline-flex items-center rounded-full bg-[#EAF2EC] px-3.5 py-1 text-xs font-bold text-[#26352E] border border-[#C8D9CD]">
            Senior Wellness Portal
          </div>

          {/* Notification Icon */}
          <Link
            href="/alerts"
            className="relative p-2 rounded-xl text-[#66736B] hover:bg-[#EAF2EC] hover:text-[#26352E] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="View Smart Alerts & Assistance"
            aria-label="View Smart Alerts & Assistance"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5 rounded-full bg-[#477A62] ring-2 ring-white" />
          </Link>

          {/* Active Profile Pill / Sign In */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E3EAE5]">
              <Link
                href="/profile"
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#EAF2EC] transition-colors"
                title="View Healthcare Profile"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#477A62] text-xs font-bold text-white shadow-xs">
                  {initials}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#26352E] leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-[#477A62] font-semibold">
                    My Profile
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => signOut()}
                className="p-2 text-[#66736B] hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E3EAE5]">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#C8D9CD] text-[#26352E] hover:bg-[#EAF2EC] text-xs font-bold transition-colors min-h-[44px]"
              >
                <LogIn className="h-4 w-4 text-[#477A62]" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#477A62] hover:bg-[#3B6551] text-white text-xs font-bold shadow-xs transition-colors min-h-[44px]"
              >
                <span>Create Account</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E3EAE5] bg-white px-4 pt-3 pb-6 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <p className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#66736B]">
            Navigation
          </p>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-bold min-h-[48px] transition-colors ${
                  active
                    ? "bg-[#EAF2EC] text-[#26352E]"
                    : "text-[#66736B] hover:text-[#26352E] hover:bg-[#F8FAF8]"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-[#477A62]" : "text-[#66736B]"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 mt-2 border-t border-[#E3EAE5]">
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-bold text-[#26352E] hover:bg-[#EAF2EC] min-h-[48px]"
            >
              <User className="h-5 w-5 text-[#477A62]" />
              <span>Patient Profile</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
