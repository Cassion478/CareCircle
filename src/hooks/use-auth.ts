"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PatientProfile } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured] = useState(isSupabaseConfigured());

  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not fetch profile:", error.message);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          fullName: data.full_name || "Patient",
          email: userEmail || data.email,
          dateOfBirth: data.date_of_birth,
          phoneNumber: data.phone_number,
          gender: data.gender,
          avatarUrl: data.avatar_url,
          bloodGroup: data.blood_group,
          allergies: data.allergies || [],
          emergencyContactName: data.emergency_contact_name,
          emergencyContactRelationship: data.emergency_contact_relationship,
          emergencyContactPhone: data.emergency_contact_phone,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch (err) {
      console.warn("Profile fetch error:", err);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (!isConfigured) {
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          if (currentUser) {
            await fetchProfile(currentUser.id, currentUser.email);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn("Auth initialization error:", err);
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id, currentUser.email);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, isConfigured, fetchProfile]);

  const signOut = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  return {
    user,
    profile,
    loading,
    isConfigured,
    signOut,
    refreshProfile: () => (user ? fetchProfile(user.id, user.email) : Promise.resolve()),
  };
}
