import { SupabaseClient } from "@supabase/supabase-js";

import { ProfileRecord } from "@/types";

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<ProfileRecord>();

  if (error) throw error;
  return data;
}
