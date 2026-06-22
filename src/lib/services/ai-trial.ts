import { SupabaseClient } from "@supabase/supabase-js";

import { AiTrialRecord, TrialStatus } from "@/types";

export async function getAiTrial(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("ai_trials")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<AiTrialRecord>();

  if (error) throw error;
  return data;
}

export async function updateAiTrialUsage(
  supabase: SupabaseClient,
  userId: string,
  inputTokens: number,
  outputTokens: number,
  status?: TrialStatus,
) {
  const trial = await getAiTrial(supabase, userId);
  if (!trial) {
    throw new Error("No se encontro la prueba gratuita del usuario.");
  }

  const nextStatus =
    status ||
    (trial.input_tokens_used + inputTokens >= trial.input_tokens_limit ||
    trial.output_tokens_used + outputTokens >= trial.output_tokens_limit
      ? "used"
      : trial.status);

  const { data, error } = await supabase
    .from("ai_trials")
    .update({
      input_tokens_used: trial.input_tokens_used + inputTokens,
      output_tokens_used: trial.output_tokens_used + outputTokens,
      total_tokens_used: trial.total_tokens_used + inputTokens + outputTokens,
      openai_uses: trial.openai_uses + 1,
      status: nextStatus,
      finished_at:
        nextStatus === "used" || nextStatus === "expired"
          ? trial.finished_at || new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .maybeSingle<AiTrialRecord>();

  if (error) throw error;
  return data;
}

export function getTrialRemaining(trial: AiTrialRecord | null) {
  if (!trial) {
    return { inputRemaining: 0, outputRemaining: 0 };
  }

  return {
    inputRemaining: Math.max(0, trial.input_tokens_limit - trial.input_tokens_used),
    outputRemaining: Math.max(0, trial.output_tokens_limit - trial.output_tokens_used),
  };
}
