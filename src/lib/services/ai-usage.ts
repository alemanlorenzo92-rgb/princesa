import { SupabaseClient } from "@supabase/supabase-js";

import {
  AiMonthlyUsageRecord,
  MonthlyPlanUsage,
  PlanId,
  TrialUsage,
} from "@/types";
import { getUsageMonth } from "@/lib/ai-usage";

export async function getMonthlyUsage(
  supabase: SupabaseClient,
  userId: string,
  month = getUsageMonth(),
) {
  const { data, error } = await supabase
    .from("ai_monthly_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .order("created_at", { ascending: false }) as {
      data: AiMonthlyUsageRecord[] | null;
      error: Error | null;
    };

  if (error) throw error;
  return data || [];
}

export async function upsertMonthlyUsage(
  supabase: SupabaseClient,
  {
    userId,
    planId,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
  }: {
    userId: string;
    planId: Extract<PlanId, "student" | "pro">;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  },
) {
  const month = getUsageMonth();
  const existing = (await getMonthlyUsage(supabase, userId, month)).find(
    (entry) => entry.plan_id === planId,
  );

  if (!existing) {
    const { data, error } = await supabase
      .from("ai_monthly_usage")
      .insert({
        user_id: userId,
        month,
        plan_id: planId,
        input_tokens_used: inputTokens,
        output_tokens_used: outputTokens,
        total_tokens_used: inputTokens + outputTokens,
        openai_uses: 1,
        estimated_cost_usd: estimatedCostUsd,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle<AiMonthlyUsageRecord>();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("ai_monthly_usage")
    .update({
      input_tokens_used: existing.input_tokens_used + inputTokens,
      output_tokens_used: existing.output_tokens_used + outputTokens,
      total_tokens_used: existing.total_tokens_used + inputTokens + outputTokens,
      openai_uses: existing.openai_uses + 1,
      estimated_cost_usd: Number(existing.estimated_cost_usd) + estimatedCostUsd,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*")
    .maybeSingle<AiMonthlyUsageRecord>();

  if (error) throw error;
  return data;
}

export async function insertAiUsageLog(
  supabase: SupabaseClient,
  {
    userId,
    planId,
    featureKey,
    materialType,
    model,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
  }: {
    userId: string;
    planId: PlanId;
    featureKey: string;
    materialType: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  },
) {
  const { error } = await supabase.from("ai_usage_logs").insert({
    user_id: userId,
    plan_id: planId,
    feature_key: featureKey,
    material_type: materialType,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    estimated_cost_usd: estimatedCostUsd,
  });

  if (error) throw error;
}

export function mapSupabaseAiState({
  subscription,
  trial,
  monthlyUsage,
  currentModel,
  lastAiUsedAt,
}: {
  subscription: { plan_id: PlanId } | null;
  trial: {
    user_id: string;
    started_at: string;
    input_tokens_limit: number;
    output_tokens_limit: number;
    input_tokens_used: number;
    output_tokens_used: number;
    total_tokens_used: number;
    openai_uses: number;
    finished_at: string | null;
    status: "active" | "used" | "expired";
  } | null;
  monthlyUsage: AiMonthlyUsageRecord[];
  currentModel?: string;
  lastAiUsedAt?: string;
}) {
  const mappedTrial: TrialUsage | null = trial
    ? {
        userId: trial.user_id,
        trialStartedAt: trial.started_at,
        trialInputTokensLimit: trial.input_tokens_limit,
        trialOutputTokensLimit: trial.output_tokens_limit,
        trialInputTokensUsed: trial.input_tokens_used,
        trialOutputTokensUsed: trial.output_tokens_used,
        trialTotalTokensUsed: trial.total_tokens_used,
        trialOpenAiUses: trial.openai_uses,
        trialFinishedAt: trial.finished_at || undefined,
        trialStatus: trial.status,
      }
    : null;

  const mappedMonthly: MonthlyPlanUsage[] = monthlyUsage.map((entry) => ({
    userId: entry.user_id,
    month: entry.month,
    planId: entry.plan_id,
    monthlyInputTokensUsed: entry.input_tokens_used,
    monthlyOutputTokensUsed: entry.output_tokens_used,
    monthlyTotalTokensUsed: entry.total_tokens_used,
    monthlyOpenAiUses: entry.openai_uses,
    estimatedCostUsd: Number(entry.estimated_cost_usd || 0),
    lastUsedAt: entry.last_used_at || undefined,
  }));

  return {
    planId: subscription?.plan_id || (mappedTrial?.trialStatus === "active" ? "trial" : "expired_trial"),
    trial: mappedTrial,
    monthlyUsage: mappedMonthly,
    currentModel,
    lastAiUsedAt,
  };
}
