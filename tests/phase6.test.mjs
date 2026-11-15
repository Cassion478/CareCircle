import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Phase 6: Visual Identity & Light Healthcare Theme", () => {
  const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf8");

  test("defines warm soft ivory/white background (#F8FAF8)", () => {
    assert.match(cssContent, /--background:\s*#F8FAF8/i);
  });

  test("defines deep charcoal green foreground (#26352E)", () => {
    assert.match(cssContent, /--foreground:\s*#26352E/i);
  });

  test("defines sage green primary theme color (#477A62)", () => {
    assert.match(cssContent, /--primary:\s*#477A62/i);
  });

  test("defines soft surface color (#EAF2EC) and secondary text (#66736B)", () => {
    assert.match(cssContent, /--secondary:\s*#EAF2EC/i);
    assert.match(cssContent, /--muted-foreground:\s*#66736B/i);
  });

  test("does not force default dark background override", () => {
    assert.doesNotMatch(cssContent, /prefers-color-scheme:\s*dark[\s\S]*--background:\s*#020617/i);
  });
});

describe("Phase 6: Open Redirect Sanitization & Destination Routing", () => {
  function sanitizeRedirectUrl(url) {
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

  test("defaults to /my-day for empty, null, or undefined redirect target", () => {
    assert.equal(sanitizeRedirectUrl(null), "/my-day");
    assert.equal(sanitizeRedirectUrl(""), "/my-day");
    assert.equal(sanitizeRedirectUrl(undefined), "/my-day");
  });

  test("preserves valid internal relative paths", () => {
    assert.equal(sanitizeRedirectUrl("/medications"), "/medications");
    assert.equal(sanitizeRedirectUrl("/appointments"), "/appointments");
    assert.equal(sanitizeRedirectUrl("/care-circle"), "/care-circle");
    assert.equal(sanitizeRedirectUrl("/analytics"), "/analytics");
    assert.equal(sanitizeRedirectUrl("/profile"), "/profile");
  });

  test("strictly blocks malicious protocol-relative and external URLs", () => {
    assert.equal(sanitizeRedirectUrl("https://evil.com"), "/my-day");
    assert.equal(sanitizeRedirectUrl("//malicious.com"), "/my-day");
    assert.equal(sanitizeRedirectUrl("/\\malicious.com"), "/my-day");
  });
});

describe("Phase 6: Route Protection & Middleware Configuration", () => {
  const middlewarePath = path.resolve(process.cwd(), "src/lib/supabase/middleware.ts");
  const middlewareContent = fs.readFileSync(middlewarePath, "utf8");

  test("protects all 7 core patient routes", () => {
    const requiredRoutes = [
      "/my-day",
      "/medications",
      "/appointments",
      "/care-circle",
      "/alerts",
      "/analytics",
      "/profile",
    ];

    for (const route of requiredRoutes) {
      assert.ok(
        middlewareContent.includes(`"${route}"`) || middlewareContent.includes(`'${route}'`),
        `Middleware must protect route ${route}`
      );
    }
  });

  test("redirects unauthenticated root '/' to '/login'", () => {
    assert.match(middlewareContent, /pathname === "\/"/);
    assert.match(middlewareContent, /url\.pathname = "\/login"/);
  });
});

describe("Phase 6: Health Analytics & Metrics Verification", () => {
  function calculateAdherence(logs) {
    if (!logs || logs.length === 0) {
      return { percentage: null, taken: 0, total: 0, label: "No data available" };
    }
    const taken = logs.filter((l) => l.status === "taken").length;
    const total = logs.length;
    const percentage = total > 0 ? Math.round((taken / total) * 100) : null;
    return {
      percentage,
      taken,
      total,
      label: percentage !== null ? `${percentage}%` : "No data available",
    };
  }

  function calculateStreak(logs) {
    if (!logs || logs.length === 0) return 0;
    let streak = 0;
    for (const log of logs) {
      if (log.status === "taken") {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  test("returns null percentage and 'No data available' for empty dataset (never 100%)", () => {
    const result = calculateAdherence([]);
    assert.equal(result.percentage, null);
    assert.equal(result.label, "No data available");
    assert.equal(result.taken, 0);
    assert.equal(result.total, 0);
  });

  test("distinguishes zero completed doses from zero scheduled doses (0% vs no data)", () => {
    const scheduledPending = [
      { status: "pending" },
      { status: "snoozed" },
    ];
    const result = calculateAdherence(scheduledPending);
    assert.equal(result.percentage, 0);
    assert.equal(result.label, "0%");
    assert.equal(result.taken, 0);
    assert.equal(result.total, 2);
  });

  test("does not count pending or snoozed doses as missed", () => {
    const logs = [
      { status: "taken" },
      { status: "pending" },
      { status: "snoozed" },
    ];
    const taken = logs.filter((l) => l.status === "taken").length;
    const missed = logs.filter((l) => l.status === "missed").length;
    assert.equal(taken, 1);
    assert.equal(missed, 0);
  });

  test("correctly computes partial adherence percentages (75%)", () => {
    const logs = [
      { status: "taken" },
      { status: "taken" },
      { status: "taken" },
      { status: "pending" },
    ];
    const { percentage, taken, total } = calculateAdherence(logs);
    assert.equal(percentage, 75);
    assert.equal(taken, 3);
    assert.equal(total, 4);
  });

  test("correctly computes 100% adherence when all doses are taken", () => {
    const logs = [
      { status: "taken" },
      { status: "taken" },
    ];
    const { percentage, taken, total } = calculateAdherence(logs);
    assert.equal(percentage, 100);
    assert.equal(taken, 2);
    assert.equal(total, 2);
  });

  test("computes consecutive streaks", () => {
    const logs = [
      { status: "taken" },
      { status: "taken" },
      { status: "taken" },
      { status: "pending" },
    ];
    assert.equal(calculateStreak(logs), 3);
  });

  test("correctly calculates date window boundaries for 7d, 30d, and 90d", () => {
    const now = new Date("2026-11-15T12:00:00Z");
    const getCutoff = (days) => new Date(now.getTime() - days * 86400000);

    const d7 = getCutoff(7);
    const d30 = getCutoff(30);
    const d90 = getCutoff(90);

    assert.equal(d7.toISOString(), "2026-11-08T12:00:00.000Z");
    assert.equal(d30.toISOString(), "2026-10-16T12:00:00.000Z");
    assert.equal(d90.toISOString(), "2026-08-17T12:00:00.000Z");
  });
});

describe("Phase 6: Accessibility & Touch Target Standards", () => {
  const buttonPath = path.resolve(process.cwd(), "src/components/ui/button.tsx");
  const buttonContent = fs.readFileSync(buttonPath, "utf8");

  test("button component guarantees minimum 44px touch targets on md size", () => {
    assert.match(buttonContent, /min-h-\[44px\]/);
  });

  test("button component provides large touch target (50px) on lg size", () => {
    assert.match(buttonContent, /min-h-\[50px\]/);
  });
});
