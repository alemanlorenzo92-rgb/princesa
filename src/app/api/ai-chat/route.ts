import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUsageMonth } from "@/lib/ai-usage";
import { canUseFeature, getPlanConfig, isPaidPlan } from "@/lib/plans";
import { buildChatContext, buildChatConversationTitle } from "@/lib/server/ai/context-builder";
import { generateChatReplyWithOpenAi } from "@/lib/server/openai";
import {
  getMonthlyUsage,
  insertAiUsageLog,
  mapSupabaseAiState,
  upsertMonthlyUsage,
} from "@/lib/services/ai-usage";
import {
  createConversation,
  getConversationById,
  updateConversation,
} from "@/lib/services/ai-conversations";
import { createMessage, getMessages } from "@/lib/services/ai-messages";
import { getAiTrial, getTrialRemaining, updateAiTrialUsage } from "@/lib/services/ai-trial";
import { getStudyFileById } from "@/lib/services/study-files";
import { getCurrentSubscription, updateSubscriptionPlan } from "@/lib/services/subscription";
import { getSubjectById } from "@/lib/services/subjects";
import { createClient } from "@/lib/supabase/server";
import { SendChatMessageResponse } from "@/types";

const requestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  fileId: z.string().uuid().optional(),
  message: z.string().trim().min(1, "El mensaje no puede estar vacio.").max(8_000),
});

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
      { error: "No se pudo identificar al usuario actual para usar el chat." },
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

  if (aiState.planId === "expired_trial") {
    return buildUpgradeResponse("Tu prueba gratuita de IA ya termino.");
  }

  if (!canUseFeature(aiState.planId, "ai_chat")) {
    return buildUpgradeResponse("Para usar el chat de estudio necesitás el plan Pro.");
  }

  const [subject, file] = await Promise.all([
    body.subjectId ? getSubjectById(supabase, body.subjectId) : Promise.resolve(null),
    body.fileId ? getStudyFileById(supabase, body.fileId) : Promise.resolve(null),
  ]);

  if (body.subjectId && (!subject || subject.userId !== user.id)) {
    return NextResponse.json(
      { error: "No tenes permiso para usar esa materia en el chat." },
      { status: 403 },
    );
  }

  if (body.fileId && (!file || file.userId !== user.id)) {
    return NextResponse.json(
      { error: "No tenes permiso para acceder a este archivo." },
      { status: 403 },
    );
  }

  if (file && !canUseFeature(aiState.planId, "pdf_chat")) {
    return NextResponse.json(
      { error: "Este chat con archivos esta disponible en planes pagos." },
      { status: 403 },
    );
  }

  if (file && !file.extractedText?.trim() && !file.sourceText?.trim()) {
    return NextResponse.json(
      {
        error:
          "Ese archivo todavia no tiene texto disponible para el chat. Extrae el texto o usa un apunte manual.",
      },
      { status: 400 },
    );
  }

  let conversation = body.conversationId
    ? await getConversationById(supabase, body.conversationId)
    : null;

  if (body.conversationId && (!conversation || conversation.userId !== user.id)) {
    return NextResponse.json(
      { error: "No se encontro la conversacion." },
      { status: 404 },
    );
  }

  if (!conversation) {
    conversation = await createConversation(supabase, user.id, {
      subjectId: subject?.id,
      fileId: file?.id,
      title: buildChatConversationTitle(body.message),
    });
  } else if (body.subjectId || body.fileId) {
    conversation = await updateConversation(supabase, conversation.id, {
      subjectId: subject?.id,
      fileId: file?.id,
    });
  }

  if (!conversation) {
    return NextResponse.json(
      { error: "No se pudo inicializar la conversacion." },
      { status: 500 },
    );
  }

  const previousMessages = await getMessages(supabase, conversation.id);
  const context = buildChatContext({
    planId: aiState.planId,
    subject,
    file,
    history: previousMessages,
    currentMessage: body.message,
  });

  const planConfig = getPlanConfig(aiState.planId);
  if (context.estimatedInputTokens > planConfig.requestInputTokensLimit) {
    return NextResponse.json(
      {
        error:
          file && aiState.planId === "trial"
            ? "El contexto del archivo es demasiado largo para tu plan."
            : "No tenes tokens suficientes para enviar este mensaje.",
      },
      { status: 400 },
    );
  }

  let maxOutputTokens = planConfig.requestOutputTokensLimit;

  if (aiState.planId === "trial") {
    const remaining = getTrialRemaining(trial);

    if (remaining.inputRemaining <= 0 || remaining.outputRemaining <= 0) {
      return buildUpgradeResponse("Tu prueba gratuita de IA ya termino.");
    }

    if (context.estimatedInputTokens > remaining.inputRemaining) {
      return NextResponse.json(
        { error: "No tenes tokens suficientes para enviar este mensaje." },
        { status: 400 },
      );
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

    if (context.estimatedInputTokens > inputRemaining) {
      return NextResponse.json(
        { error: "No tenes tokens suficientes para enviar este mensaje." },
        { status: 400 },
      );
    }

    maxOutputTokens = Math.min(maxOutputTokens, outputRemaining);
  }

  try {
    const openAiResult = await generateChatReplyWithOpenAi({
      systemPrompt: context.systemPrompt,
      historyMessages: context.historyMessages,
      userMessage: body.message,
      maxOutputTokens,
    });

    const userMessage = await createMessage(supabase, user.id, {
      conversationId: conversation.id,
      role: "user",
      content: body.message,
    });

    const assistantMessage = await createMessage(supabase, user.id, {
      conversationId: conversation.id,
      role: "assistant",
      content: openAiResult.content,
      model: openAiResult.model,
      inputTokens: openAiResult.usage.inputTokens,
      outputTokens: openAiResult.usage.outputTokens,
      totalTokens: openAiResult.usage.totalTokens,
    });

    await updateConversation(supabase, conversation.id, {
      title:
        conversation.title === "Nueva conversacion"
          ? buildChatConversationTitle(body.message)
          : conversation.title,
      subjectId: subject?.id,
      fileId: file?.id,
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
      featureKey: file ? "pdf_chat" : "ai_chat",
      materialType: file ? "pdf_chat" : "ai_chat",
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
      lastAiUsedAt: assistantMessage.createdAt,
    });

    const responsePayload: SendChatMessageResponse = {
      conversationId: conversation.id,
      assistantMessage,
      model: openAiResult.model,
      inputTokens: openAiResult.usage.inputTokens,
      outputTokens: openAiResult.usage.outputTokens,
      totalTokens: openAiResult.usage.totalTokens,
      contextWarning: context.contextWarning,
      aiState: nextAiState,
    };

    void userMessage;
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("AI chat failed", error);
    return NextResponse.json(
      {
        error:
          "OpenAI no pudo responder el chat en este momento. Intenta nuevamente.",
      },
      { status: 502 },
    );
  }
}
