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
  deleteStudyPdf,
  uploadStudyPdf,
} from "@/lib/services/storage-files";
import {
  createSubject,
  getAllSubjects,
  removeSubject,
  updateSubject as updateSubjectRecord,
} from "@/lib/services/subjects";
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
} from "@/types";

interface StudyMaterialPayload {
  subjectId: string;
  documentId?: string;
  sourceText: string;
  materialType: StudyMaterialType;
  detailLevel: DetailLevel;
  style: MaterialStyle;
}

interface SaveMaterialPayload
  extends Omit<StudyMaterial, "id" | "userId" | "createdAt"> {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

interface StudyDocumentInput
  extends Omit<StudyDocument, "id" | "userId" | "createdAt"> {
  pdfFile?: File | null;
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
  message: string;
}

interface AppDataContextValue {
  subjects: Subject[];
  events: CalendarEvent[];
  documents: StudyDocument[];
  materials: StudyMaterial[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  addSubject: (input: Omit<Subject, "id" | "userId" | "createdAt">) => Promise<void>;
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
  ) => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      setSubjects([]);
      setEvents([]);
      setDocuments([]);
      setMaterials([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const [nextSubjects, nextEvents, nextDocuments, nextMaterials] =
        await Promise.all([
          getAllSubjects(supabase),
          getAllAcademicEvents(supabase),
          getAllStudyFiles(supabase),
          getAllGeneratedMaterials(supabase),
        ]);

      setSubjects(nextSubjects);
      setEvents(nextEvents);
      setDocuments(nextDocuments);
      setMaterials(nextMaterials);
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
    if (!user || !supabase) return;
    await createSubject(supabase, user.id, input);
    await refresh();
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
    if (!supabase) return;
    await removeSubject(supabase, subjectId);
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
    if (!user || !supabase) return;
    const { pdfFile, ...documentInput } = input;
    let uploadedFilePath: string | null = null;
    let nextInput: Omit<StudyDocument, "id" | "userId" | "createdAt"> = {
      ...documentInput,
    };

    try {
      if (pdfFile) {
        const upload = await uploadStudyPdf(
          supabase,
          pdfFile,
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

      await createStudyFile(supabase, user.id, nextInput);
    } catch (createError) {
      if (uploadedFilePath) {
        await deleteStudyPdf(supabase, uploadedFilePath).catch(() => undefined);
      }
      throw createError;
    }

    await refresh();
  }

  async function updateDocument(
    documentId: string,
    input: StudyDocumentInput,
  ) {
    if (!supabase) return;
    const { pdfFile, ...documentInput } = input;
    void pdfFile;
    await updateStudyFile(supabase, documentId, documentInput);
    await refresh();
  }

  async function deleteDocument(documentId: string) {
    if (!supabase) return;
    await removeStudyFile(supabase, documentId);
    await refresh();
  }

  async function openDocument(documentId: string) {
    if (!supabase) return null;
    return getStudyFileSignedUrl(supabase, documentId);
  }

  async function extractDocumentText(documentId: string) {
    const result = await extractTextForStudyFile(documentId);
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

    return createConversation(supabase, user.id, input);
  }

  async function updateChatConversation(
    conversationId: string,
    input: Partial<ConversationInput>,
  ) {
    if (!supabase) return null;
    return updateConversationRecord(supabase, conversationId, input);
  }

  async function deleteChatConversation(conversationId: string) {
    if (!supabase) return;
    await deleteConversationRecord(supabase, conversationId);
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
    subjectId,
    sourceText,
    materialType,
    detailLevel,
    style,
  }: StudyMaterialPayload) {
    const subject = subjects.find((entry) => entry.id === subjectId);
    const payload = {
      sourceText,
      materialType,
      detailLevel,
      style,
      subjectName: subject?.name || "Materia sin nombre",
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
    await createGeneratedMaterial(supabase, user.id, input);
    await refresh();
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
    if (!supabase) return;
    await removeGeneratedMaterial(supabase, materialId);
    await refresh();
  }

  return (
    <AppDataContext.Provider
      value={{
        subjects,
        events,
        documents,
        materials,
        loading,
        error,
        refresh,
        addSubject,
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
