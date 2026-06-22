import "server-only";

import { redirect } from "next/navigation";

import { getProfile } from "@/lib/services/profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileRecord, UserRole } from "@/types";

function getConfiguredAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";

  return new Set(
    raw
      .split(/[,\n;]/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function resolveUserRole(
  email?: string | null,
  profileRole?: ProfileRecord["role"],
): UserRole {
  if (profileRole === "admin") {
    return "admin";
  }

  if (email && getConfiguredAdminEmails().has(email.trim().toLowerCase())) {
    return "admin";
  }

  return "student";
}

export async function getCurrentAdminState() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    return {
      user: null,
      profile: null,
      role: "student" as UserRole,
      isAdmin: false,
    };
  }

  const profile = await getProfile(supabase, user.id).catch(() => null);
  const role = resolveUserRole(user.email, profile?.role);

  return {
    user,
    profile,
    role,
    isAdmin: role === "admin",
  };
}

export async function requireAdminAccess() {
  const state = await getCurrentAdminState();

  if (!state.user) {
    redirect("/login?next=/admin");
  }

  if (!state.isAdmin) {
    redirect("/dashboard");
  }

  return state;
}
