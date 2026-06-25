"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import {
  createAcademicEvent,
  getAllAcademicEvents,
  removeAcademicEvent,
  updateAcademicEvent,
} from "@/lib/services/academic-events";
import {
  createGeneratedMaterial,
  getAllGeneratedMaterials,
  removeGeneratedMaterial,
  updateGeneratedMaterial,
} from "@/lib/services/generated-materials";
import {
  createConversation,
  deleteConversation as deleteConversationRecord,
  getConversationById,
  getConversations,
  updateConversation as updateConversationRecord,
} from "@/lib/services/ai-conversations";
import { getMessages } from "@/lib/services/ai-messages";
import {
  createStudyFile,
  extractTextForStudyFile,
  getAllStudyFiles,
  getStudyFileSignedUrl,
  removeStudyFile,
  updateStudyFile,
} from "@/lib/services/study-files";
import {
  deleteStudyFile,
  uploadStudyFile,
} from "@/lib/services/storage-files";
import { uploadGeneratedMaterialImage } from "@/lib/services/generated-material-images";
import {
  createSubject,
  getSubjectByName,
  getAllSubjects,
  removeSubject,
  updateSubject as updateSubjectRecord,
} from "@/lib/services/subjects";
import {
  createUserActivityLog,
  getUserActivityLogs,
} from "@/lib/services/user-activity";
import {
  CalendarEvent,
  DetailLevel,
  GenerateMaterialResponse,
  ExtractStudyFileTextResponse,
  MaterialStyle,
  AiConversation,
  AiMessage,
  SendChatMessageResponse,
  StudyDocument,
  StudyMaterial,
  StudyMaterialType,
  Subject,
  UserActivityLog,
} from "@/types";

interface StudyMaterialPayload {
  subjectId?: string;
  subjectName: string;
  documentId?: string;
  documentIds?: string[];
  sourceText: string;
  materialType: StudyMaterialType;
  detailLevel: DetailLevel;
  style: MaterialStyle;
  generateImage?: boolean;
}

interface SaveMaterialPayload
  extends Omit<StudyMaterial, "id" | "userId" | "createdAt"> {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  imageDataUrl?: string;
}

interface StudyDocumentInput
  extends Omit<StudyDocument, "id" | "userId" | "createdAt"> {
  uploadedFile?: File | null;
}

interface ConversationInput {
  subjectId?: string;
  fileId?: string;
  title: string;
}

interface SendChatMessageInput {
  conversationId?: string;
  subjectId?: string;
  fileId?: string;
  fileIds?: string[];
  message: string;
}

interface AppDataContextValue {
  subjects: Subject[];
  events: CalendarEvent[];
  documents: StudyDocument[];
  materials: StudyMaterial[];
  activityLogs: UserActivityLog[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  addSubject: (input: Omit<Subject, "id" | "userId" | "createdAt">) => Promise<Subject | null>;
  ensureSubject: (name: string) => Promise<Subject | null>;
  updateSubject: (
    subjectId: string,
    input: Omit<Subject, "id" | "userId" | "createdAt">,
  ) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  addEvent: (
    input: Omit<CalendarEvent, "id" | "userId" | "createdAt">,
  ) => Promise<void>;
  updateEvent: (
    eventId: string,
    input: Omit<CalendarEvent, "id" | "userId" | "createdAt">,
  ) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  addDocument: (
    input: StudyDocumentInput,
  ) => Promise<StudyDocument | null>;
  updateDocument: (
    documentId: string,
    input: StudyDocumentInput,
  ) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  openDocument: (documentId: string) => Promise<string | null>;
  extractDocumentText: (documentId: string) => Promise<ExtractStudyFileTextResponse>;
  getChatConversations: () => Promise<AiConversation[]>;
  getChatConversationById: (conversationId: string) => Promise<AiConversation | null>;
  createChatConversation: (input: ConversationInput) => Promise<AiConversation>;
  updateChatConversation: (
    conversationId: string,
    input: Partial<ConversationInput>,
  ) => Promise<AiConversation | null>;
  deleteChatConversation: (conversationId: string) => Promise<void>;
  getChatMessages: (conversationId: string) => Promise<AiMessage[]>;
  sendChatMessage: (input: SendChatMessageInput) => Promise<SendChatMessageResponse>;
  generateMaterial: (input: StudyMaterialPayload) => Promise<GenerateMaterialResponse>;
  saveMaterial: (input: SaveMaterialPayload) => Promise<void>;
  updateMaterial: (
    materialId: string,
    input: Omit<StudyMaterial, "id" | "userId" | "createdAt">,
  ) => Promise<void>;
  deleteMaterial: (materialId: string) => Promise<void>;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

async function createUserActivityLogSafely(
  supabase: ReturnType<typeof createClient> | null,
  input: Parameters<typeof createUserActivityLog>[1],
) {
  if (!supabase) return;

  try {
    await createUserActivityLog(supabase, input);
  } catch (error) {
    console.warn("User activity log skipped", error);
  }
}

function getSettledValue<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
  label: string,
) {
  if (result.status === "fulfilled") {
    return result.value;
  }

  console.warn(`${label} skipped`, result.reason);
  return fallback;
}

export function AppDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, updateCurrentUserAiState } = useAuth();
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      setSubjects([]);
      setEvents([]);
      setDocuments([]);
      setMaterials([]);
      setActivityLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const [
        nextSubjectsResult,
        nextEventsResult,
        nextDocumentsResult,
        nextMaterialsResult,
        nextActivityLogsResult,
      ] = await Promise.allSettled([
        getAllSubjects(supabase),
        getAllAcademicEvents(supabase),
        getAllStudyFiles(supabase),
        getAllGeneratedMaterials(supabase),
        getUserActivityLogs(supabase),
      ]);

      if (nextSubjectsResult.status === "rejected") {
        throw nextSubjectsResult.reason;
      }

      if (nextEventsResult.status === "rejected") {
        throw nextEventsResult.reason;
      }

      if (nextDocumentsResult.status === "rejected") {
        throw nextDocumentsResult.reason;
      }

      setSubjects(nextSubjectsResult.value);
      setEvents(nextEventsResult.value);
      setDocuments(nextDocumentsResult.value);
      setMaterials(getSettledValue(nextMaterialsResult, [], "Generated materials refresh"));
      setActivityLogs(getSettledValue(nextActivityLogsResult, [], "User activity refresh"));
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "No se pudieron cargar los datos academicos.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  async function addSubject(input: Omit<Subject, "id" | "userId" | "createdAt">) {
    if (!user || !supabase) return null;
    const subject = await createSubject(supabase, user.id, input);
    await createUserActivityLogSafely(supabase, {
      userId: user.id,
      action: "subject_created",
      entityType: "subject",
      entityId: subject.id,
      title: `Materia creada: ${subject.name}`,
      detail: subject.description || undefined,
    });
    await refresh();
    return subject;
  }

  async function ensureSubject(name: string) {
    if (!user || !supabase) return null;
    const normalizedName = name.trim();
    if (!normalizedName) return null;

    const localMatch = subjects.find(
      (subject) => subject.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    );
    if (localMatch) return localMatch;

    const existing = await getSubjectByName(supabase, user.id, normalizedName);
    if (existing) {
      await refresh();
      return existing;
    }

    return addSubject({
      name: normalizedName,
      description: "",
      professor: "",
      schedule: "",
      color: "#FF8A65",
    });
  }

  async function updateSubject(
    subjectId: string,
    input: Omit<Subject, "id" | "userId" | "createdAt">,
  ) {
    if (!supabase) return;
    await updateSubjectRecord(supabase, subjectId, input);
    await refresh();
  }

  async function deleteSubject(subjectId: string) {
    if (!user || !supabase) return;
    const current = subjects.find((subject) => subject.id === subjectId);
    await removeSubject(supabase, subjectId);
    await createUserActivityLogSafely(supabase, {
      userId: user.id,
      action: "subject_deleted",
      entityType: "subject",
      entityId: subjectId,
      title: `Materia eliminada: ${current?.name || "Sin nombre"}`,
    });
    await refresh();
  }

  async function addEvent(
    input: Omit<CalendarEvent, "id" | "userId" | "createdAt">,
  ) {
    if (!user || !supabase) return;
    await createAcademicEvent(supabase, user.id, input);
    await refresh();
  }

  async function updateEvent(
    eventId: string,
    input: Omit<CalendarEvent, "id" | "userId" | "createdAt">,
  ) {
    if (!supabase) return;
    await updateAcademicEvent(supabase, eventId, input);
    await refresh();
  }

  async function deleteEvent(eventId: string) {
    if (!supabase) return;
    await removeAcademicEvent(supabase, eventId);
    await refresh();
  }

  async function addDocument(
    input: StudyDocumentInput,
  ) {
    if (!user || !supabase) return null;
    const { uploadedFile, ...documentInput } = input;
    let uploadedFilePath: string | null = null;
    let nextInput: Omit<StudyDocument, "id" | "userId" | "createdAt"> = {
      ...documentInput,
    };

    try {
      if (uploadedFile) {
        const upload = await uploadStudyFile(
          supabase,
          uploadedFile,
          user.id,
          documentInput.subjectId || undefined,
        );
        uploadedFilePath = upload.filePath;

        nextInput = {
          ...documentInput,
          fileDataUrl: undefined,
          fileName: upload.originalFileName,
          filePath: upload.filePath,
          fileType: upload.fileType,
          extractedText: documentInput.extractedText || "",
        };
      } else {
        nextInput = {
          ...documentInput,
          fileDataUrl: documentInput.fileDataUrl,
          fileName: documentInput.fileName,
          filePath: undefined,
          fileType: documentInput.fileType || "text",
        };
      }

      const createdDocument = await createStudyFile(supabase, user.id, nextInput);
      await createUserActivityLogSafely(supabase, {
        userId: user.id,
        action: "file_uploaded",
        entityType: "study_file",
        entityId: createdDocument.id,
        title: `Archivo guardado: ${createdDocument.title}`,
        detail: createdDocument.fileName || createdDocument.sourceText?.slice(0, 120) || undefined,
      });
      await refresh();
      return createdDocument;
    } catch (createError) {
      if (uploadedFilePath) {
        await deleteStudyFile(supabase, uploadedFilePath).catch(() => undefined);
      }
      throw createError;
    }
  }

  async function updateDocument(
    documentId: string,
    input: StudyDocumentInput,
  ) {
    if (!supabase) return;
    const { uploadedFile, ...documentInput } = input;
    void uploadedFile;
    await updateStudyFile(supabase, documentId, documentInput);
    await refresh();
  }

  async function deleteDocument(documentId: string) {
    if (!user || !supabase) return;
    const current = documents.find((document) => document.id === documentId);
    await removeStudyFile(supabase, documentId);
    await createUserActivityLogSafely(supabase, {
      userId: user.id,
      action: "file_deleted",
      entityType: "study_file",
      entityId: documentId,
      title: `Archivo eliminado: ${current?.title || "Sin titulo"}`,
      detail: current?.fileName,
    });
    await refresh();
  }

  async function openDocument(documentId: string) {
    if (!supabase) return null;
    return getStudyFileSignedUrl(supabase, documentId);
  }

  async function extractDocumentText(documentId: string) {
    const result = await extractTextForStudyFile(documentId);
    if (user && supabase) {
      const current = documents.find((document) => document.id === documentId);
      await createUserActivityLogSafely(supabase, {
        userId: user.id,
        action: "file_text_extracted",
        entityType: "study_file",
        entityId: documentId,
        title: `Texto extraido: ${current?.title || "Archivo"}`,
        detail: result.warning || `${result.extractedTextLength} caracteres disponibles.`,
      });
    }
    await refresh();
    return result;
  }

  async function getChatConversations() {
    if (!supabase) return [];
    return getConversations(supabase);
  }

  async function getChatConversationById(conversationId: string) {
    if (!supabase) return null;
    return getConversationById(supabase, conversationId);
  }

  async function createChatConversation(input: ConversationInput) {
    if (!user || !supabase) {
      throw new Error("Necesitas iniciar sesion para crear una conversacion.");
    }

    const conversation = await createConversation(supabase, user.id, input);
    await createUserActivityLogSafely(supabase, {
      userId: user.id,
      action: "chat_conversation_created",
      entityType: "conversation",
      entityId: conversation.id,
      title: `Conversacion creada: ${conversation.title}`,
    });
    return conversation;
  }

  async function updateChatConversation(
    conversationId: string,
    input: Partial<ConversationInput>,
  ) {
    if (!supabase) return null;
    return updateConversationRecord(supabase, conversationId, input);
  }

  async function deleteChatConversation(conversationId: string) {
    if (!user || !supabase) return;
    const current = await getConversationById(supabase, conversationId);
    await deleteConversationRecord(supabase, conversationId);
    await createUserActivityLogSafely(supabase, {
      userId: user.id,
      action: "chat_conversation_deleted",
      entityType: "conversation",
      entityId: conversationId,
      title: `Conversacion eliminada: ${current?.title || "Sin titulo"}`,
    });
  }

  async function getChatMessages(conversationId: string) {
    if (!supabase) return [];
    return getMessages(supabase, conversationId);
  }

  async function sendChatMessage(input: SendChatMessageInput) {
    const response = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(errorPayload?.error || "No se pudo enviar el mensaje.");
    }

    const data = (await response.json()) as SendChatMessageResponse;
    updateCurrentUserAiState(data.aiState);
    return data;
  }

  async function generateMaterial({
    subjectName,
    sourceText,
    materialType,
    detailLevel,
    style,
    documentIds,
    generateImage,
  }: StudyMaterialPayload) {
    const payload = {
      sourceText,
      materialType,
      detailLevel,
      style,
      subjectName,
      documentIds,
      generateImage: Boolean(generateImage),
    };

    const response = await fetch("/api/generate-study-material", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(errorPayload?.error || "No se pudo generar el material.");
    }

    const data = (await response.json()) as GenerateMaterialResponse;
    updateCurrentUserAiState(data.aiState);
    return data;
  }

  async function saveMaterial(input: SaveMaterialPayload) {
    if (!user || !supabase) return;
    let uploadedImagePath: string | undefined;

    try {
      let nextInput = { ...input };

      if (input.imageDataUrl) {
        uploadedImagePath = await uploadGeneratedMaterialImage(
          supabase,
          input.imageDataUrl,
          user.id,
          input.subjectId || undefined,
          input.title,
        );

        nextInput = {
          ...input,
          imagePath: uploadedImagePath,
          imageUrl: undefined,
        };
      }

      const material = await createGeneratedMaterial(supabase, user.id, nextInput);
      await createUserActivityLogSafely(supabase, {
        userId: user.id,
        action: "material_saved",
        entityType: "generated_material",
        entityId: material.id,
        title: `Material guardado: ${material.title}`,
        detail: material.type,
      });
      await refresh();
    } catch (saveError) {
      if (uploadedImagePath) {
        await deleteStudyFile(supabase, uploadedImagePath).catch(() => undefined);
      }

      throw saveError;
    }
  }

  async function updateMaterial(
    materialId: string,
    input: Omit<StudyMaterial, "id" | "userId" | "createdAt">,
  ) {
    if (!supabase) return;
    await updateGeneratedMaterial(supabase, materialId, input);
    await refresh();
  }

  async function deleteMaterial(materialId: string) {
    if (!user || !supabase) return;
    const current = materials.find((material) => material.id === materialId);
    await removeGeneratedMaterial(supabase, materialId);
    await createUserActivityLogSafely(supabase, {
      userId: user.id,
      action: "material_deleted",
      entityType: "generated_material",
      entityId: materialId,
      title: `Material eliminado: ${current?.title || "Sin titulo"}`,
      detail: current?.type,
    });
    await refresh();
  }

  return (
    <AppDataContext.Provider
      value={{
        subjects,
        events,
        documents,
        materials,
        activityLogs,
        loading,
        error,
        refresh,
        addSubject,
        ensureSubject,
        updateSubject,
        deleteSubject,
        addEvent,
        updateEvent,
        deleteEvent,
        addDocument,
        updateDocument,
        deleteDocument,
        openDocument,
        extractDocumentText,
        getChatConversations,
        getChatConversationById,
        createChatConversation,
        updateChatConversation,
        deleteChatConversation,
        getChatMessages,
        sendChatMessage,
        generateMaterial,
        saveMaterial,
        updateMaterial,
        deleteMaterial,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}
