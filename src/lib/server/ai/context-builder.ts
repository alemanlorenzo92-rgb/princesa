import "server-only";

import { estimateTokens } from "@/lib/ai-usage";
import { PlanId, Subject, StudyDocument, AiMessage } from "@/types";

const CHAT_CONTEXT_LIMITS: Record<PlanId, { maxContextChars: number; maxHistoryMessages: number }> =
  {
    trial: { maxContextChars: 1_400, maxHistoryMessages: 4 },
    student: { maxContextChars: 8_000, maxHistoryMessages: 8 },
    pro: { maxContextChars: 18_000, maxHistoryMessages: 12 },
    expired_trial: { maxContextChars: 0, maxHistoryMessages: 0 },
  };

function normalizeSnippet(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateContext(value: string, size: number) {
  if (value.length <= size) {
    return { text: value, truncated: false };
  }

  return {
    text: value.slice(0, size).trim(),
    truncated: true,
  };
}

export function getChatContextLimit(planId: PlanId) {
  return CHAT_CONTEXT_LIMITS[planId];
}

export function buildChatConversationTitle(message: string) {
  const normalized = normalizeSnippet(message);
  if (!normalized) return "Nueva conversacion";

  return normalized.split(" ").slice(0, 6).join(" ").slice(0, 60);
}

export function buildAcademicChatSystemPrompt() {
  return [
    "Sos un asistente academico dentro de EstudioAI.",
    "Ayudas al estudiante a entender temas, estudiar para examenes, organizar apuntes y resolver dudas.",
    "Responde claro, con estructura y sin inventar informacion.",
    "Si la pregunta depende de un PDF o apunte y el contexto no alcanza, indica que no aparece en el material cargado.",
    "No menciones claves internas, planes, tokens ni detalles del sistema salvo que el usuario pregunte por limites.",
  ].join(" ");
}

export function buildChatContext({
  planId,
  subject,
  files,
  history,
  currentMessage,
}: {
  planId: PlanId;
  subject?: Subject | null;
  files?: StudyDocument[];
  history: AiMessage[];
  currentMessage: string;
}) {
  const limits = getChatContextLimit(planId);
  const contextSections: string[] = [];
  let contextWarning = "";

  if (subject) {
    contextSections.push(
      [
        "Contexto de materia:",
        `Nombre: ${subject.name}`,
        subject.description ? `Descripcion: ${subject.description}` : "",
        subject.professor ? `Profesor: ${subject.professor}` : "",
        subject.schedule ? `Horario: ${subject.schedule}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const usableFiles = (files || []).filter((file) =>
    Boolean(file.extractedText?.trim() || file.sourceText?.trim()),
  );

  if (usableFiles.length) {
    const rawFileContext = usableFiles
      .map((file, index) =>
        [
          `Archivo ${index + 1}:`,
          `Titulo: ${file.title}`,
          file.description ? `Descripcion: ${file.description}` : "",
          file.extractedText?.trim() || file.sourceText?.trim() || "",
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");

    const truncated = truncateContext(rawFileContext, limits.maxContextChars);
    if (truncated.truncated) {
      contextWarning =
        usableFiles.length === 1
          ? "El contexto del archivo fue recortado para respetar los limites de tu plan."
          : "El contexto combinado de los archivos fue recortado para respetar los limites de tu plan.";
    }

    contextSections.push(["Contexto de archivos:", truncated.text].filter(Boolean).join("\n"));
  }

  const limitedHistory = history.slice(-limits.maxHistoryMessages);
  const historyMessages = limitedHistory.map((message) => ({
    role: message.role,
    content: normalizeSnippet(message.content),
  }));

  const contextText = contextSections.join("\n\n");
  const estimateInputText = [
    buildAcademicChatSystemPrompt(),
    contextText,
    ...historyMessages.map((message) => `${message.role}: ${message.content}`),
    currentMessage,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    systemPrompt: contextText
      ? `${buildAcademicChatSystemPrompt()}\n\n${contextText}`
      : buildAcademicChatSystemPrompt(),
    historyMessages,
    contextWarning,
    estimatedInputTokens: estimateTokens(estimateInputText),
  };
}
