export interface PublicRuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  vapidPublicKey: string;
}

declare global {
  interface Window {
    __PUBLIC_RUNTIME_CONFIG__?: PublicRuntimeConfig;
  }
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  if (typeof window !== "undefined" && window.__PUBLIC_RUNTIME_CONFIG__) {
    return window.__PUBLIC_RUNTIME_CONFIG__;
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "",
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  };
}
