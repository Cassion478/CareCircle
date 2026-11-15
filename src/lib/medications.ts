import { DbMedication, DbMedicationDoseLog, Medication, TimeSlot } from "@/types";

/**
 * Categorize a 24-hour time string ("HH:MM") into an elderly-friendly routine time slot.
 */
export function getTimeSlot(timeStr: string): TimeSlot {
  const [hourStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);

  if (isNaN(hour)) return "morning";
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * Format 24-hour "HH:MM" time into a friendly 12-hour format ("8:00 AM").
 */
export function formatTimeLabel(timeStr: string): string {
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const min = minStr || "00";

  if (isNaN(hour)) return timeStr;

  const period = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${formattedHour}:${min} ${period}`;
}

/**
 * Validate medication form fields with clear human-readable messages.
 */
export function validateMedication(input: {
  name: string;
  dosage: string;
  startDate: string;
  endDate?: string | null;
  scheduledTimes: string[];
}): { isValid: boolean; error?: string } {
  if (!input.name || !input.name.trim()) {
    return { isValid: false, error: "Please enter the medication name." };
  }

  if (!input.dosage || !input.dosage.trim()) {
    return { isValid: false, error: "Please enter the dosage (e.g. 500 mg, 1 tablet)." };
  }

  if (!input.scheduledTimes || input.scheduledTimes.length === 0) {
    return { isValid: false, error: "Please select at least one scheduled daily time." };
  }

  if (!input.startDate) {
    return { isValid: false, error: "Please enter a start date." };
  }

  if (input.endDate && input.endDate.trim()) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (end < start) {
      return { isValid: false, error: "End date cannot be earlier than start date." };
    }
  }

  return { isValid: true };
}

/**
 * Combine active medications with today's dose logs into a chronological daily routine.
 */
export function buildTodaySchedule(
  medications: DbMedication[],
  logs: DbMedicationDoseLog[],
  targetDate: Date = new Date()
): Medication[] {
  const targetDateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
  const scheduleItems: Medication[] = [];

  for (const med of medications) {
    if (!med.is_active) continue;

    // Check date bounds
    if (med.start_date > targetDateStr) continue;
    if (med.end_date && med.end_date < targetDateStr) continue;

    for (const time of med.scheduled_times) {
      // Build ISO string for occurrence
      // Note: we format targetDateStr + "T" + time + ":00"
      const occurrenceTime = `${targetDateStr}T${time}:00`;
      const occurrenceIso = new Date(occurrenceTime).toISOString();

      // Find matching log if one exists for this medication & time
      const matchingLog = logs.find((l) => {
        if (l.medication_id !== med.id) return false;
        // Compare date and time or exact ISO
        const logTime = new Date(l.scheduled_for).toISOString();
        return logTime === occurrenceIso || l.scheduled_for.startsWith(`${targetDateStr}T${time}`);
      });

      const status = matchingLog ? matchingLog.status : "pending";
      const lastTaken = matchingLog?.taken_at
        ? new Date(matchingLog.taken_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : undefined;

      const snoozedUntil = matchingLog?.snoozed_until
        ? new Date(matchingLog.snoozed_until).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : undefined;

      scheduleItems.push({
        id: med.id,
        patientId: med.patient_id,
        name: med.name,
        dosage: med.dosage,
        frequency: `${med.scheduled_times.length} times daily`,
        times: med.scheduled_times,
        timeSlot: getTimeSlot(time),
        timeLabel: formatTimeLabel(time),
        instructions: med.instructions || "Take as instructed by your physician.",
        status: status as Medication["status"],
        lastTaken: lastTaken ? `Today, ${lastTaken}` : undefined,
        snoozedUntil: snoozedUntil ? `Snoozed until ${snoozedUntil}` : undefined,
        doseLogId: matchingLog?.id,
        scheduledFor: occurrenceIso,
        createdAt: med.created_at || new Date().toISOString(),
      });
    }
  }

  // Sort chronologically by scheduled time
  scheduleItems.sort((a, b) => {
    const timeA = a.scheduledFor || "";
    const timeB = b.scheduledFor || "";
    return timeA.localeCompare(timeB);
  });

  return scheduleItems;
}
