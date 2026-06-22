import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { estimateTokens, getUsageMonth } from "@/lib/ai-usage";
import { ABSOLUTE_SOURCE_TEXT_CHAR_LIMIT } from "@/lib/ai-config";
import { canUseFeature, getPlanConfig, isPaidPlan } from "@/lib/plans";
import {
  getMonthlyUsage,
  insertAiUsageLog,
  mapSupabaseAiState,
  upsertMonthlyUsage,
} from "@/lib/services/ai-usage";
import { getAiTrial, getTrialRemaining, updateAiTrialUsage } from "@/lib/services/ai-trial";
import { getCurrentSubscription, updateSubscriptionPlan } from "@/lib/services/subscription";
import { createClient } from "@/lib/supabase/server";
import { generateStudyMaterialWithOpenAi } from "@/lib/server/openai";
import { GenerateMaterialResponse, StudyMaterialType } from "@/types";

const requestSchema = z.object({
  sourceText: z
    .string()
    .trim()
    .min(1, "El texto base no puede estar vacio.")
    .max(
      ABSOLUTE_SOURCE_TEXT_CHAR_LIMIT,
      `El texto supera el maximo tecnico de ${ABSOLUTE_SOURCE_TEXT_CHAR_LIMIT} caracteres.`,
    ),
  materialType: z.enum([
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
  ]),
  detailLevel: z.enum(["low", "medium", "high"]),
  style: z.enum(["simple", "academic", "easy"]),
  subjectName: z.string().trim().min(1, "La materia es obligatoria.").max(120),
});

function getFeatureFromMaterialType(materialType: StudyMaterialType) {
  return materialType;
}

function buildUpgradeResponse(message: string, status = 403) {
  return NextResponse.json(
    {
      error: message,
      cta: "Mejora tu plan para seguir usando IA.",
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json(
      { error: "No se pudo validar la sesion actual." },
      { status: 401 },
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "No se pudo identificar al usuario actual para usar IA." },
      { status: 401 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es JSON valido." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Solicitud invalida." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "OpenAI API no esta configurada en el servidor. Define OPENAI_API_KEY en .env.local.",
      },
      { status: 500 },
    );
  }

  const body = parsed.data;
  const [subscription, trial, monthlyUsage] = await Promise.all([
    getCurrentSubscription(supabase, user.id),
    getAiTrial(supabase, user.id),
    getMonthlyUsage(supabase, user.id, getUsageMonth()),
  ]);

  const aiState = mapSupabaseAiState({
    subscription,
    trial,
    monthlyUsage,
  });
  const featureKey = getFeatureFromMaterialType(body.materialType);

  if (aiState.planId === "expired_trial") {
    return buildUpgradeResponse("Tu prueba gratuita de IA ya fue utilizada.");
  }

  if (!canUseFeature(aiState.planId, featureKey)) {
    if (aiState.planId === "trial") {
      return buildUpgradeResponse(
        "Esta funcion no esta disponible durante la prueba gratuita.",
      );
    }

    return buildUpgradeResponse("Mejora tu plan para usar esta funcion.");
  }

  const estimatedInputTokens = estimateTokens(body.sourceText);
  const planConfig = getPlanConfig(aiState.planId);

  if (estimatedInputTokens > planConfig.requestInputTokensLimit) {
    return NextResponse.json(
      {
        error:
          aiState.planId === "trial"
            ? "El texto es demasiado largo para tu prueba gratuita."
            : "El texto es demasiado largo para tu plan actual.",
      },
      { status: 400 },
    );
  }

  let maxOutputTokens = planConfig.requestOutputTokensLimit;

  if (aiState.planId === "trial") {
    const remaining = getTrialRemaining(trial);

    if (remaining.inputRemaining <= 0 || remaining.outputRemaining <= 0) {
      return buildUpgradeResponse("Te quedaste sin tokens de prueba gratuita.");
    }

    if (estimatedInputTokens > remaining.inputRemaining) {
      return buildUpgradeResponse("Te quedaste sin tokens de prueba gratuita.");
    }

    maxOutputTokens = Math.min(maxOutputTokens, remaining.outputRemaining);
  }

  if (isPaidPlan(aiState.planId)) {
    const currentUsage = monthlyUsage.find((entry) => entry.plan_id === aiState.planId);
    const inputRemaining =
      planConfig.monthlyInputTokensLimit - (currentUsage?.input_tokens_used || 0);
    const outputRemaining =
      planConfig.monthlyOutputTokensLimit - (currentUsage?.output_tokens_used || 0);

    if (inputRemaining <= 0 || outputRemaining <= 0) {
      return buildUpgradeResponse(
        "Llegaste al limite mensual de IA de tu plan actual.",
      );
    }

    if (estimatedInputTokens > inputRemaining) {
      return buildUpgradeResponse(
        "No te quedan tokens mensuales suficientes para este pedido.",
      );
    }

    maxOutputTokens = Math.min(maxOutputTokens, outputRemaining);
  }

  try {
    const openAiResult = await generateStudyMaterialWithOpenAi({
      ...body,
      maxOutputTokens,
    });

    if (aiState.planId === "trial") {
      const updatedTrial = await updateAiTrialUsage(
        supabase,
        user.id,
        openAiResult.usage.inputTokens,
        openAiResult.usage.outputTokens,
      );

      if (updatedTrial?.status === "used") {
        await updateSubscriptionPlan(supabase, user.id, "expired_trial");
      }
    }

    if (isPaidPlan(aiState.planId)) {
      await upsertMonthlyUsage(supabase, {
        userId: user.id,
        planId: aiState.planId,
        inputTokens: openAiResult.usage.inputTokens,
        outputTokens: openAiResult.usage.outputTokens,
        estimatedCostUsd: openAiResult.usage.estimatedCostUsd,
      });
    }

    await insertAiUsageLog(supabase, {
      userId: user.id,
      planId: aiState.planId,
      featureKey,
      materialType: body.materialType,
      model: openAiResult.model,
      inputTokens: openAiResult.usage.inputTokens,
      outputTokens: openAiResult.usage.outputTokens,
      estimatedCostUsd: openAiResult.usage.estimatedCostUsd,
    });

    const [nextSubscription, nextTrial, nextMonthlyUsage] = await Promise.all([
      getCurrentSubscription(supabase, user.id),
      getAiTrial(supabase, user.id),
      getMonthlyUsage(supabase, user.id, getUsageMonth()),
    ]);

    const nextAiState = mapSupabaseAiState({
      subscription: nextSubscription,
      trial: nextTrial,
      monthlyUsage: nextMonthlyUsage,
      currentModel: openAiResult.model,
      lastAiUsedAt: new Date().toISOString(),
    });

    const responsePayload: GenerateMaterialResponse = {
      content: openAiResult.content,
      mode: "openai",
      aiState: nextAiState,
      usage: {
        model: openAiResult.model,
        inputTokens: openAiResult.usage.inputTokens,
        outputTokens: openAiResult.usage.outputTokens,
        totalTokens: openAiResult.usage.totalTokens,
        estimatedCostUsd: openAiResult.usage.estimatedCostUsd,
      },
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("OpenAI generation failed", error);
    return NextResponse.json(
      {
        error:
          "OpenAI no pudo generar el material en este momento. Revisa la clave del servidor, el modelo configurado o intenta nuevamente.",
      },
      { status: 502 },
    );
  }
}
