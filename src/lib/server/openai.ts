import "server-only";

import OpenAI from "openai";

import { AiMessageRole, DetailLevel, MaterialStyle, StudyMaterialType } from "@/types";

interface GenerateStudyMaterialInput {
  sourceText: string;
  materialType: StudyMaterialType;
  detailLevel: DetailLevel;
  style: MaterialStyle;
  subjectName: string;
}

const DEFAULT_MODEL = "gpt-4.1-mini";

function buildMaterialTypeInstruction(type: StudyMaterialType) {
  const labels: Record<StudyMaterialType, string> = {
    short_summary: "un resumen corto",
    full_summary: "un resumen completo",
    key_concepts: "una lista de conceptos importantes",
    comparison_chart: "un cuadro comparativo en texto",
    outline: "un esquema jerarquico",
    concept_map: "un mapa conceptual en texto",
    q_and_a: "preguntas y respuestas",
    flashcards: "flashcards en texto",
    study_guide: "una guia de estudio",
    mock_exam: "un simulacro de examen",
    simple_explanation: "una explicacion simple",
    detailed_explanation: "una explicacion detallada",
    key_topics: "una lista de temas clave",
    glossary: "un glosario de terminos",
    timeline: "una linea de tiempo si aplica",
  };

  return labels[type];
}

function buildDetailInstruction(detailLevel: DetailLevel) {
  if (detailLevel === "high") return "Desarrolla el contenido con bastante profundidad.";
  if (detailLevel === "low") return "Mantenlo breve y directo.";
  return "Usa una profundidad intermedia y facil de repasar.";
}

function buildStyleInstruction(style: MaterialStyle) {
  if (style === "academic") return "Usa un tono academico, preciso y bien organizado.";
  if (style === "easy") return "Usa un lenguaje muy facil de entender y orientado a estudio rapido.";
  return "Usa un estilo simple, claro y ordenado.";
}

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

function getModelPricing(model: string) {
  const envInput = process.env.OPENAI_PRICE_INPUT_PER_1M;
  const envOutput = process.env.OPENAI_PRICE_OUTPUT_PER_1M;

  if (envInput && envOutput) {
    return {
      inputPer1M: Number(envInput),
      outputPer1M: Number(envOutput),
    };
  }

  if (model === "gpt-4.1-mini") {
    return {
      inputPer1M: 0.4,
      outputPer1M: 1.6,
    };
  }

  return {
    inputPer1M: 0,
    outputPer1M: 0,
  };
}

export function buildStudyMaterialPrompt({
  materialType,
  detailLevel,
  style,
  subjectName,
}: Omit<GenerateStudyMaterialInput, "sourceText">) {
  return [
    "Actua como un asistente academico experto para estudiantes universitarios.",
    `Materia: ${subjectName}.`,
    `Genera ${buildMaterialTypeInstruction(materialType)}.`,
    buildDetailInstruction(detailLevel),
    buildStyleInstruction(style),
    "Organiza la respuesta con titulos y subtitulos claros cuando tenga sentido.",
    "No inventes informacion que no aparezca en el contenido base.",
    "Si faltan datos importantes, indicalo de forma explicita.",
    "No menciones que eres una IA ni expliques tu proceso interno.",
    "Devuelve texto limpio, listo para mostrar dentro de una aplicacion web de estudio.",
  ].join(" ");
}

export async function generateStudyMaterialWithOpenAi(
  input: GenerateStudyMaterialInput & { maxOutputTokens: number },
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no esta configurada en el servidor.");
  }

  const client = new OpenAI({ apiKey });
  const prompt = buildStudyMaterialPrompt(input);
  const model = getOpenAiModel();
  const response = await client.responses.create({
    model,
    max_output_tokens: input.maxOutputTokens,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: prompt }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: input.sourceText,
          },
        ],
      },
    ],
  });

  const content = response.output_text?.trim();
  if (!content) {
    throw new Error("OpenAI no devolvio contenido util.");
  }

  const inputTokens = response.usage?.input_tokens || 0;
  const outputTokens = response.usage?.output_tokens || 0;
  const totalTokens = response.usage?.total_tokens || inputTokens + outputTokens;
  const pricing = getModelPricing(model);
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M;

  return {
    content,
    model,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    },
  };
}

export async function generateChatReplyWithOpenAi({
  systemPrompt,
  historyMessages,
  userMessage,
  maxOutputTokens,
}: {
  systemPrompt: string;
  historyMessages: Array<{ role: AiMessageRole; content: string }>;
  userMessage: string;
  maxOutputTokens: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no esta configurada en el servidor.");
  }

  const client = new OpenAI({ apiKey });
  const model = getOpenAiModel();
  const chatInput: OpenAI.Responses.ResponseInput = [
    {
      type: "message",
      role: "system",
      content: [{ type: "input_text", text: systemPrompt }],
    },
    ...historyMessages.map((message) => ({
      type: "message" as const,
      role: message.role,
      content: [{ type: "input_text" as const, text: message.content }],
    })),
    {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: userMessage }],
    },
  ];

  const response = await client.responses.create({
    model,
    max_output_tokens: maxOutputTokens,
    input: chatInput,
  });

  const content = response.output_text?.trim();
  if (!content) {
    throw new Error("OpenAI no devolvio contenido util para el chat.");
  }

  const inputTokens = response.usage?.input_tokens || 0;
  const outputTokens = response.usage?.output_tokens || 0;
  const totalTokens = response.usage?.total_tokens || inputTokens + outputTokens;
  const pricing = getModelPricing(model);
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M;

  return {
    content,
    model,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    },
  };
}
