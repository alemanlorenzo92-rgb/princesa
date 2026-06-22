"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

import { getPublicRuntimeConfig } from "@/lib/public-runtime";

let browserClient: SupabaseClient | null = null;

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl: url, supabaseAnonKey: anonKey } = getPublicRuntimeConfig();

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno.",
    );
  }

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
