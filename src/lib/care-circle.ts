import { CareCircleMemberRole, CareCircleMemberStatus } from "@/types";

export interface CareCircleInput {
  memberName: string;
  relationship: string;
  email?: string | null;
  phoneNumber?: string | null;
  role: CareCircleMemberRole;
  status?: CareCircleMemberStatus;
}

export const COMMON_RELATIONSHIPS = [
  "Daughter",
  "Son",
  "Spouse / Partner",
  "Sister / Brother",
  "Grandchild",
  "Daughter-in-law / Son-in-law",
  "Neighbor / Friend",
  "Home Health Aide",
  "Family Doctor",
  "Other Trusted Contact",
];

export function validateCareCircleMember(input: CareCircleInput): {
  isValid: boolean;
  error?: string;
} {
  if (!input.memberName || !input.memberName.trim()) {
    return { isValid: false, error: "Please enter the family member or contact's name." };
  }

  if (!input.relationship || !input.relationship.trim()) {
    return { isValid: false, error: "Please specify your relationship with this contact." };
  }

  if (input.email && input.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email.trim())) {
      return { isValid: false, error: "Please enter a valid email address." };
    }
  }

  if (input.phoneNumber && input.phoneNumber.trim()) {
    const cleaned = input.phoneNumber.replace(/[\s\-\(\)\+]/g, "");
    if (cleaned.length < 7) {
      return { isValid: false, error: "Please enter a valid phone number (at least 7 digits)." };
    }
  }

  if (input.role !== "caregiver" && input.role !== "emergency_contact") {
    return { isValid: false, error: "Please select a valid role (Caregiver or Emergency Contact)." };
  }

  return { isValid: true };
}

export function getAvatarInitials(name: string): string {
  if (!name || !name.trim()) return "CC";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
