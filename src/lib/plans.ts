import { FeatureKey, PlanId } from "@/types";

export interface TrialConfig {
  id: "trial";
  label: string;
  inputTokensLimit: number;
  outputTokensLimit: number;
  requestInputTokensLimit: number;
  requestOutputTokensLimit: number;
  features: FeatureKey[];
}

export interface PlanConfig {
  id: PlanId;
  label: string;
  monthlyInputTokensLimit: number;
  monthlyOutputTokensLimit: number;
  requestInputTokensLimit: number;
  requestOutputTokensLimit: number;
  features: FeatureKey[];
}

export const TRIAL_CONFIG: TrialConfig = {
  id: "trial",
  label: "Prueba gratuita de IA",
  inputTokensLimit: 10_000,
  outputTokensLimit: 4_000,
  requestInputTokensLimit: 1_500,
  requestOutputTokensLimit: 400,
  features: ["short_summary", "key_concepts", "simple_explanation", "ai_chat"],
};

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  trial: {
    id: "trial",
    label: TRIAL_CONFIG.label,
    monthlyInputTokensLimit: 0,
    monthlyOutputTokensLimit: 0,
    requestInputTokensLimit: TRIAL_CONFIG.requestInputTokensLimit,
    requestOutputTokensLimit: TRIAL_CONFIG.requestOutputTokensLimit,
    features: TRIAL_CONFIG.features,
  },
  student: {
    id: "student",
    label: "Plan Estudiante",
    monthlyInputTokensLimit: 300_000,
    monthlyOutputTokensLimit: 100_000,
    requestInputTokensLimit: 15_000,
    requestOutputTokensLimit: 2_500,
    features: [
      "ai_chat",
      "short_summary",
      "full_summary",
      "key_concepts",
      "comparison_chart",
      "outline",
      "q_and_a",
      "flashcards",
      "study_guide",
      "pdf_chat",
      "low_image_generation",
    ],
  },
  pro: {
    id: "pro",
    label: "Plan Pro",
    monthlyInputTokensLimit: 1_500_000,
    monthlyOutputTokensLimit: 500_000,
    requestInputTokensLimit: 50_000,
    requestOutputTokensLimit: 6_000,
    features: [
      "ai_chat",
      "short_summary",
      "full_summary",
      "key_concepts",
      "comparison_chart",
      "outline",
      "concept_map",
      "q_and_a",
      "flashcards",
      "study_guide",
      "mock_exam",
      "simple_explanation",
      "detailed_explanation",
      "key_topics",
      "glossary",
      "timeline",
      "pdf_chat",
      "low_image_generation",
    ],
  },
  expired_trial: {
    id: "expired_trial",
    label: "Prueba gratuita finalizada",
    monthlyInputTokensLimit: 0,
    monthlyOutputTokensLimit: 0,
    requestInputTokensLimit: 0,
    requestOutputTokensLimit: 0,
    features: [],
  },
};

export const PLAN_ORDER: PlanId[] = ["trial", "student", "pro", "expired_trial"];

export function getPlanConfig(planId: PlanId) {
  return PLAN_CONFIGS[planId];
}

export function canUseFeature(planId: PlanId, featureKey: FeatureKey) {
  return PLAN_CONFIGS[planId].features.includes(featureKey);
}

export function isPaidPlan(planId: PlanId) {
  return planId === "student" || planId === "pro";
}

export function isTrialPlan(planId: PlanId) {
  return planId === "trial";
}

export function isExpiredTrial(planId: PlanId) {
  return planId === "expired_trial";
}
