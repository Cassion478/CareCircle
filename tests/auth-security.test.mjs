import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// 1. Test Open Redirect Sanitization Logic
function sanitizeRedirectUrl(url) {
  if (!url) return "/profile";
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

describe("Security Audit: Open Redirect Protection", () => {
  test("allows safe internal relative URLs", () => {
    assert.equal(sanitizeRedirectUrl("/profile"), "/profile");
    assert.equal(sanitizeRedirectUrl("/my-day"), "/my-day");
    assert.equal(sanitizeRedirectUrl("/caregiver"), "/caregiver");
  });

  test("blocks external URLs and protocol-relative attacks", () => {
    assert.equal(sanitizeRedirectUrl("https://evil.com"), "/profile");
    assert.equal(sanitizeRedirectUrl("http://attacker.com/steal"), "/profile");
    assert.equal(sanitizeRedirectUrl("//attacker.com"), "/profile");
    assert.equal(sanitizeRedirectUrl("///attacker.com"), "/profile");
    assert.equal(sanitizeRedirectUrl("javascript:alert(1)"), "/profile");
    assert.equal(sanitizeRedirectUrl("/\\attacker.com"), "/profile");
  });

  test("handles null, empty, or undefined safely", () => {
    assert.equal(sanitizeRedirectUrl(null), "/profile");
    assert.equal(sanitizeRedirectUrl(""), "/profile");
    assert.equal(sanitizeRedirectUrl(undefined), "/profile");
  });
});

// 2. Test Patient Data Isolation & Derivation Logic
describe("Security Audit: Patient Data Isolation", () => {
  function deriveActivePatient(user, profile) {
    if (!user) {
      return {
        id: "",
        name: "Patient",
        email: "",
        role: "patient",
        emergencyContact: {
          name: "Primary Family Contact",
          relationship: "Family Member",
          phone: "None configured",
        },
      };
    }
    return {
      id: user.id,
      name: profile?.fullName || user.user_metadata?.full_name || "Patient",
      email: user.email || "",
      role: "patient",
      emergencyContact: {
        name:
          profile?.emergencyContactName ||
          user.user_metadata?.emergency_contact_name ||
          "Primary Family Contact",
        relationship:
          profile?.emergencyContactRelationship ||
          user.user_metadata?.emergency_contact_relationship ||
          "Family Member",
        phone:
          profile?.emergencyContactPhone ||
          user.user_metadata?.emergency_contact_phone ||
          "None configured",
      },
    };
  }

  test("unauthenticated visitor receives neutral fallback and zero demo data", () => {
    const patient = deriveActivePatient(null, null);
    assert.equal(patient.id, "");
    assert.equal(patient.name, "Patient");
    assert.equal(patient.emergencyContact.phone, "None configured");
    assert.notEqual(patient.name, "Smt. Shanti Devi");
  });

  test("authenticated user NEVER leaks Demo Patient family contacts", () => {
    const authUser = {
      id: "usr-real-123",
      email: "ramesh.kumar@example.com",
      user_metadata: { full_name: "Ramesh Kumar" },
    };

    // User has no emergency contact configured yet
    const patient = deriveActivePatient(authUser, null);

    assert.equal(patient.id, "usr-real-123");
    assert.equal(patient.name, "Ramesh Kumar");
    assert.notEqual(patient.emergencyContact.name, "Pooja Sharma");
    assert.notEqual(patient.emergencyContact.phone, "+91 98201 45678");
    assert.equal(patient.emergencyContact.phone, "None configured");
  });

  test("authenticated user with custom profile displays their own contact", () => {
    const authUser = { id: "usr-456", email: "anita@example.com" };
    const authProfile = {
      fullName: "Anita Desai",
      emergencyContactName: "Vikram Desai",
      emergencyContactRelationship: "Son",
      emergencyContactPhone: "+91 91234 56789",
    };

    const patient = deriveActivePatient(authUser, authProfile);

    assert.equal(patient.name, "Anita Desai");
    assert.equal(patient.emergencyContact.name, "Vikram Desai");
    assert.equal(patient.emergencyContact.phone, "+91 91234 56789");
  });
});

// 3. Test SQL Migration & RLS Security Rules
describe("Security Audit: SQL Schema & RLS Policies Verification", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261115_create_profiles.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  test("profiles table enforces UUID primary key referencing auth.users", () => {
    assert.match(sql, /id uuid references auth\.users\(id\) on delete cascade primary key/i);
  });

  test("Row Level Security is explicitly enabled on public.profiles", () => {
    assert.match(sql, /alter table public\.profiles enable row level security;/i);
  });

  test("SELECT policy strictly enforces auth.uid() = id", () => {
    assert.match(sql, /create policy "Users can view own profile"/i);
    assert.match(sql, /using \(auth\.uid\(\) = id\)/i);
  });

  test("INSERT policy strictly enforces auth.uid() = id", () => {
    assert.match(sql, /create policy "Users can insert own profile"/i);
    assert.match(sql, /with check \(auth\.uid\(\) = id\)/i);
  });

  test("UPDATE policy strictly checks both existing and new row ownership", () => {
    assert.match(sql, /create policy "Users can update own profile"/i);
    assert.match(sql, /using \(auth\.uid\(\) = id\)\s+with check \(auth\.uid\(\) = id\)/i);
  });

  test("No public DELETE policy is created (strictly defaulting to deny)", () => {
    assert.doesNotMatch(sql, /for delete/i);
  });

  test("Database triggers use SECURITY DEFINER with set search_path = public", () => {
    const handleNewUser = sql.includes("function public.handle_new_user()");
    const handleUpdatedAt = sql.includes("function public.handle_updated_at()");
    assert.ok(handleNewUser && handleUpdatedAt);

    // Verify search_path isolation to prevent search_path hijacking
    const matches = sql.match(/security definer set search_path = public/g);
    assert.equal(matches?.length, 2);
  });

  test("Signup trigger catches exceptions to prevent signup transaction rollback", () => {
    assert.match(sql, /exception\s+when others then/i);
    assert.match(sql, /raise warning/i);
  });
});
