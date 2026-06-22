"use client";

import { createContext, useEffect, useState } from "react";
import { SupabaseClient, User } from "@supabase/supabase-js";

import { getCurrentMonthlyUsage, getUsageMonth } from "@/lib/ai-usage";
import { createClient } from "@/lib/supabase/client";
import { getMonthlyUsage, mapSupabaseAiState } from "@/lib/services/ai-usage";
import { getAiTrial } from "@/lib/services/ai-trial";
import { getProfile } from "@/lib/services/profile";
import {
  getCurrentSubscription,
  updateSubscriptionPlan,
} from "@/lib/services/subscription";
import { AiAccountState, PlanId, UserAccount } from "@/types";

interface RegisterResult {
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  user: UserAccount | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  updateCurrentUserAiState: (aiState: AiAccountState) => void;
  setPlanForDevelopment: (planId: PlanId) => Promise<void>;
  resetTrialForDevelopment: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
);

async function buildAppUser(
  supabase: SupabaseClient,
  authUser: User,
): Promise<UserAccount> {
  const [profile, subscription, trial, monthlyUsage] = await Promise.all([
    getProfile(supabase, authUser.id),
    getCurrentSubscription(supabase, authUser.id),
    getAiTrial(supabase, authUser.id),
    getMonthlyUsage(supabase, authUser.id),
  ]);

  const currentMonthlyUsage = getCurrentMonthlyUsage(
    mapSupabaseAiState({
      subscription,
      trial,
      monthlyUsage,
    }),
    getUsageMonth(),
  );

  const aiState = mapSupabaseAiState({
    subscription,
    trial,
    monthlyUsage,
    currentModel: currentMonthlyUsage?.lastModelUsed,
    lastAiUsedAt: currentMonthlyUsage?.lastUsedAt,
  });

  return {
    id: authUser.id,
    name: profile?.full_name || authUser.user_metadata.full_name || "Estudiante",
    email: profile?.email || authUser.email || "",
    createdAt: profile?.created_at || authUser.created_at,
    aiState,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(hasSupabaseEnv);

  function requireSupabaseClient() {
    return createClient();
  }

  async function refreshUser() {
    const client = requireSupabaseClient();
    const {
      data: { user: authUser },
      error,
    } = await client.auth.getUser();

    if (error) {
      throw error;
    }

    if (!authUser) {
      setUser(null);
      return;
    }

    const nextUser = await buildAppUser(client, authUser);
    setUser(nextUser);
  }

  useEffect(() => {
    let active = true;
    if (!hasSupabaseEnv) {
      return () => {
        active = false;
      };
    }

    const browserClient = createClient();

    async function bootstrap() {
      try {
        const {
          data: { session: currentSession },
        } = await browserClient.auth.getSession();
        if (!active) return;
        if (currentSession?.user) {
          const nextUser = await buildAppUser(browserClient, currentSession.user);
          if (!active) return;
          setUser(nextUser);
        } else {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = browserClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession?.user) {
        setUser(null);
        return;
      }

      void buildAppUser(browserClient, nextSession.user).then((nextUser) => {
        if (active) {
          setUser(nextUser);
        }
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function register(name: string, email: string, password: string) {
    const client = requireSupabaseClient();
    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.session?.user) {
      const nextUser = await buildAppUser(client, data.session.user);
      setUser(nextUser);
    }

    return {
      needsEmailConfirmation: !data.session,
    };
  }

  async function login(email: string, password: string) {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw error;
    }
  }

  async function logout() {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
  }

  function updateCurrentUserAiState(aiState: AiAccountState) {
    setUser((current) => (current ? { ...current, aiState } : current));
  }

  async function setPlanForDevelopment(planId: PlanId) {
    if (process.env.NODE_ENV === "production" || !user) return;
    const client = requireSupabaseClient();

    await updateSubscriptionPlan(client, user.id, planId);

    if (planId === "trial") {
      await client
        .from("ai_trials")
        .update({
          status: "active",
          finished_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    if (planId === "expired_trial") {
      await client
        .from("ai_trials")
        .update({
          status: "expired",
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    await refreshUser();
  }

  async function resetTrialForDevelopment() {
    if (process.env.NODE_ENV === "production" || !user) return;
    const client = requireSupabaseClient();

    await Promise.all([
      updateSubscriptionPlan(client, user.id, "trial"),
      client
        .from("ai_trials")
        .update({
          status: "active",
          input_tokens_used: 0,
          output_tokens_used: 0,
          total_tokens_used: 0,
          openai_uses: 0,
          started_at: new Date().toISOString(),
          finished_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id),
      client.from("ai_monthly_usage").delete().eq("user_id", user.id),
      client.from("ai_usage_logs").delete().eq("user_id", user.id),
    ]);

    await refreshUser();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateCurrentUserAiState,
        setPlanForDevelopment,
        resetTrialForDevelopment,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
