import {
  AiAccountState,
  MonthlyPlanUsage,
  PlanId,
  TrialUsage,
  UserAccount,
} from "@/types";
import { PLAN_CONFIGS, TRIAL_CONFIG, isPaidPlan } from "@/lib/plans";
import { ESTIMATED_CHARS_PER_TOKEN } from "@/lib/ai-config";

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.trim().length / ESTIMATED_CHARS_PER_TOKEN));
}

export function getUsageMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function createInitialTrialUsage(userId: string): TrialUsage {
  return {
    userId,
    trialStartedAt: new Date().toISOString(),
    trialInputTokensLimit: TRIAL_CONFIG.inputTokensLimit,
    trialOutputTokensLimit: TRIAL_CONFIG.outputTokensLimit,
    trialInputTokensUsed: 0,
    trialOutputTokensUsed: 0,
    trialTotalTokensUsed: 0,
    trialOpenAiUses: 0,
    trialStatus: "active",
  };
}

export function createInitialAiAccountState(userId: string): AiAccountState {
  return {
    planId: "trial",
    trial: createInitialTrialUsage(userId),
    monthlyUsage: [],
  };
}

export function ensureAiAccountState(user: Omit<UserAccount, "aiState"> & { aiState?: AiAccountState }) {
  const aiState = user.aiState || createInitialAiAccountState(user.id);
  return normalizeAiState({ ...aiState, trial: aiState.trial || createInitialTrialUsage(user.id) }, user.id);
}

export function normalizeAiState(aiState: AiAccountState, userId: string): AiAccountState {
  const nextTrial = aiState.trial
    ? {
        ...aiState.trial,
        userId,
      }
    : null;

  const normalized: AiAccountState = {
    planId: aiState.planId,
    trial: nextTrial,
    monthlyUsage: aiState.monthlyUsage.map((entry) => ({ ...entry, userId })),
    currentModel: aiState.currentModel,
    lastAiUsedAt: aiState.lastAiUsedAt,
  };

  if (normalized.planId === "trial" && nextTrial?.trialStatus !== "active") {
    normalized.planId = "expired_trial";
  }

  if (normalized.planId === "expired_trial" && nextTrial?.trialStatus === "active") {
    normalized.planId = "trial";
  }

  return normalized;
}

export function getCurrentMonthlyUsage(aiState: AiAccountState, month = getUsageMonth()) {
  return aiState.monthlyUsage.find((entry) => entry.month === month) || null;
}

export function createEmptyMonthlyUsage(
  userId: string,
  planId: Extract<PlanId, "student" | "pro">,
  month = getUsageMonth(),
): MonthlyPlanUsage {
  return {
    userId,
    month,
    planId,
    monthlyInputTokensUsed: 0,
    monthlyOutputTokensUsed: 0,
    monthlyTotalTokensUsed: 0,
    monthlyOpenAiUses: 0,
    estimatedCostUsd: 0,
  };
}

export function getRemainingTrialTokens(aiState: AiAccountState) {
  const trial = aiState.trial;
  if (!trial) {
    return { inputRemaining: 0, outputRemaining: 0 };
  }

  return {
    inputRemaining: Math.max(0, trial.trialInputTokensLimit - trial.trialInputTokensUsed),
    outputRemaining: Math.max(0, trial.trialOutputTokensLimit - trial.trialOutputTokensUsed),
  };
}

export function getRemainingMonthlyTokens(aiState: AiAccountState, month = getUsageMonth()) {
  const usage = getCurrentMonthlyUsage(aiState, month);
  const config = PLAN_CONFIGS[aiState.planId];

  return {
    inputRemaining: Math.max(0, config.monthlyInputTokensLimit - (usage?.monthlyInputTokensUsed || 0)),
    outputRemaining: Math.max(0, config.monthlyOutputTokensLimit - (usage?.monthlyOutputTokensUsed || 0)),
    usage,
  };
}

export function markTrialAsFinished(aiState: AiAccountState, status: "used" | "expired") {
  if (!aiState.trial) return aiState;

  const nextState: AiAccountState = {
    ...aiState,
    planId: "expired_trial",
    trial: {
      ...aiState.trial,
      trialStatus: status,
      trialFinishedAt: aiState.trial.trialFinishedAt || new Date().toISOString(),
    },
  };

  return nextState;
}

export function applySuccessfulUsage({
  aiState,
  userId,
  inputTokens,
  outputTokens,
  model,
  estimatedCostUsd,
  usedAt = new Date().toISOString(),
}: {
  aiState: AiAccountState;
  userId: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  estimatedCostUsd: number;
  usedAt?: string;
}) {
  if (aiState.planId === "trial" && aiState.trial) {
    const nextTrial: TrialUsage = {
      ...aiState.trial,
      trialInputTokensUsed: aiState.trial.trialInputTokensUsed + inputTokens,
      trialOutputTokensUsed: aiState.trial.trialOutputTokensUsed + outputTokens,
      trialTotalTokensUsed:
        aiState.trial.trialTotalTokensUsed + inputTokens + outputTokens,
      trialOpenAiUses: aiState.trial.trialOpenAiUses + 1,
    };

    let nextState: AiAccountState = {
      ...aiState,
      trial: nextTrial,
      currentModel: model,
      lastAiUsedAt: usedAt,
    };

    if (
      nextTrial.trialInputTokensUsed >= nextTrial.trialInputTokensLimit ||
      nextTrial.trialOutputTokensUsed >= nextTrial.trialOutputTokensLimit
    ) {
      nextState = markTrialAsFinished(nextState, "used");
    }

    return nextState;
  }

  if (isPaidPlan(aiState.planId)) {
    const month = getUsageMonth(new Date(usedAt));
    const currentUsage =
      getCurrentMonthlyUsage(aiState, month) ||
      createEmptyMonthlyUsage(userId, aiState.planId, month);
    const nextUsage: MonthlyPlanUsage = {
      ...currentUsage,
      planId: aiState.planId,
      monthlyInputTokensUsed: currentUsage.monthlyInputTokensUsed + inputTokens,
      monthlyOutputTokensUsed: currentUsage.monthlyOutputTokensUsed + outputTokens,
      monthlyTotalTokensUsed:
        currentUsage.monthlyTotalTokensUsed + inputTokens + outputTokens,
      monthlyOpenAiUses: currentUsage.monthlyOpenAiUses + 1,
      estimatedCostUsd: currentUsage.estimatedCostUsd + estimatedCostUsd,
      lastUsedAt: usedAt,
      lastModelUsed: model,
    };

    return {
      ...aiState,
      monthlyUsage: [
        ...aiState.monthlyUsage.filter((entry) => entry.month !== month),
        nextUsage,
      ],
      currentModel: model,
      lastAiUsedAt: usedAt,
    };
  }

  return aiState;
}

export function setPlanInDevelopment(aiState: AiAccountState, userId: string, planId: PlanId) {
  if (planId === "trial") {
    const trial = aiState.trial || createInitialTrialUsage(userId);
    return normalizeAiState(
      {
        ...aiState,
        planId,
        trial: {
          ...trial,
          trialStatus: "active",
          trialFinishedAt: undefined,
        },
      },
      userId,
    );
  }

  if (planId === "expired_trial") {
    return normalizeAiState(
      markTrialAsFinished(
        {
          ...aiState,
          trial: aiState.trial || createInitialTrialUsage(userId),
        },
        "expired",
      ),
      userId,
    );
  }

  return normalizeAiState(
    {
      ...aiState,
      planId,
      trial: aiState.trial || createInitialTrialUsage(userId),
    },
    userId,
  );
}

export function resetTrialInDevelopment(userId: string) {
  return createInitialAiAccountState(userId);
}
