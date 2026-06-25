"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CardSection } from "@/components/card-section";
import { EmptyState } from "@/components/empty-state";
import {
  Field,
  PrimaryButton,
  SecondaryButton,
  inputClassName,
} from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { canUseFeature } from "@/lib/plans";
import { hasExtractedText } from "@/lib/services/study-files";
import { validateStudyFile } from "@/lib/services/storage-files";
import { canExtractTextFromStudyFile } from "@/lib/study-file-config";
import { formatDate } from "@/lib/utils";
import { AiConversation, AiMessage, StudyDocument } from "@/types";

function isStudyDocument(
  document: StudyDocument | undefined,
): document is StudyDocument {
  return Boolean(document);
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    subjects,
    documents,
    addDocument,
    ensureSubject,
    extractDocumentText,
    getChatConversations,
    getChatMessages,
    createChatConversation,
    updateChatConversation,
    deleteChatConversation,
    sendChatMessage,
  } = useAppData();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    searchParams.get("subjectId") || "",
  );
  const [subjectNameInput, setSubjectNameInput] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(
    searchParams.get("fileId") ? [searchParams.get("fileId") || ""] : [],
  );
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const aiState = user?.aiState;
  const planId = aiState?.planId || "expired_trial";
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const selectedFiles = selectedFileIds
    .map((fileId) => documents.find((document) => document.id === fileId))
    .filter(isStudyDocument);
  const filteredDocuments = selectedSubjectId
    ? documents.filter((document) => document.subjectId === selectedSubjectId)
    : documents;
  const canUseChat = canUseFeature(planId, "ai_chat");
  const canUsePdfChat = canUseFeature(planId, "pdf_chat");

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const nextConversations = await getChatConversations();
        setConversations(nextConversations);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar las conversaciones.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, [getChatConversations]);

  async function resolveSubject() {
    if (selectedSubjectId) {
      const selected = subjects.find((entry) => entry.id === selectedSubjectId);
      return {
        subjectId: selectedSubjectId,
        subjectName: selected?.name || subjectNameInput.trim(),
      };
    }

    if (!subjectNameInput.trim()) {
      return { subjectId: "", subjectName: "" };
    }

    const ensuredSubject = await ensureSubject(subjectNameInput);
    if (!ensuredSubject) {
      return { subjectId: "", subjectName: subjectNameInput.trim() };
    }

    setSelectedSubjectId(ensuredSubject.id);
    setSubjectNameInput(ensuredSubject.name);
    return {
      subjectId: ensuredSubject.id,
      subjectName: ensuredSubject.name,
    };
  }

  async function handleInlineUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setUploadingFile(true);
      setError("");
      setNotice("");
      const subject = await resolveSubject();
      const createdIds: string[] = [];

      for (const file of files) {
        validateStudyFile(file);

        const createdDocument = await addDocument({
          subjectId: subject.subjectId,
          title: file.name.replace(/\.[^.]+$/, "") || file.name,
          description: "Archivo cargado desde chat de estudio.",
          sourceText: "",
          extractedText: "",
          uploadedFile: file,
        });

        if (!createdDocument) {
          throw new Error("No se pudo guardar uno de los archivos.");
        }

        createdIds.push(createdDocument.id);

        if (
          createdDocument.filePath
          && canExtractTextFromStudyFile({
            fileName: createdDocument.fileName,
            fileType: createdDocument.fileType,
          })
        ) {
          await extractDocumentText(createdDocument.id);
        }
      }

      setSelectedFileIds((current) => Array.from(new Set([...current, ...createdIds])));
      setNotice(
        files.length === 1
          ? "Archivo cargado correctamente."
          : `${files.length} archivos cargados correctamente.`,
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo cargar el archivo desde el chat.",
      );
    } finally {
      setUploadingFile(false);
      event.target.value = "";
    }
  }

  async function loadConversation(conversation: AiConversation) {
    try {
      setSelectedConversationId(conversation.id);
      setSelectedSubjectId(conversation.subjectId || "");
      const selected = subjects.find((subject) => subject.id === conversation.subjectId);
      setSubjectNameInput(selected?.name || "");
      setSelectedFileIds(conversation.fileId ? [conversation.fileId] : []);
      setError("");
      const nextMessages = await getChatMessages(conversation.id);
      setMessages(nextMessages);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los mensajes.",
      );
    }
  }

  async function refreshConversations(selectConversationId?: string) {
    const nextConversations = await getChatConversations();
    setConversations(nextConversations);

    const targetId = selectConversationId || selectedConversationId;
    if (targetId) {
      const targetConversation = nextConversations.find((entry) => entry.id === targetId);
      if (targetConversation) {
        await loadConversation(targetConversation);
      }
    }
  }

  async function handleCreateConversation() {
    try {
      setError("");
      const subject = await resolveSubject();
      const conversation = await createChatConversation({
        title: "Nueva conversacion",
        subjectId: subject.subjectId || undefined,
        fileId: selectedFileIds[0] || undefined,
      });
      await refreshConversations(conversation.id);
      setMessages([]);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo crear la conversacion.",
      );
    }
  }

  async function handleRenameConversation(conversationId: string, currentTitle: string) {
    const nextTitle = window.prompt("Nuevo titulo para la conversacion", currentTitle)?.trim();
    if (!nextTitle) return;

    try {
      setError("");
      await updateChatConversation(conversationId, { title: nextTitle });
      await refreshConversations(conversationId);
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : "No se pudo renombrar la conversacion.",
      );
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    try {
      setError("");
      await deleteChatConversation(conversationId);
      const isCurrent = selectedConversationId === conversationId;
      if (isCurrent) {
        setSelectedConversationId("");
        setMessages([]);
      }
      await refreshConversations();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar la conversacion.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;

    try {
      setSending(true);
      setError("");
      setNotice("");
      const subject = await resolveSubject();
      const response = await sendChatMessage({
        conversationId: selectedConversationId || undefined,
        subjectId: subject.subjectId || undefined,
        fileId: selectedFileIds[0] || undefined,
        fileIds: selectedFileIds,
        message: draft.trim(),
      });

      setDraft("");
      if (response.contextWarning) {
        setNotice(response.contextWarning);
      }

      await refreshConversations(response.conversationId);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "No se pudo enviar el mensaje.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="IA"
        title="Chat de estudio"
        description="Hace preguntas sobre una materia, crea la materia al vuelo si hace falta y subi archivos sin salir del chat."
        action={
          <PrimaryButton type="button" onClick={() => void handleCreateConversation()}>
            Nueva conversacion
          </PrimaryButton>
        }
      />

      {planId === "expired_trial" ? (
        <CardSection>
          <p className="text-lg font-semibold text-slate-950">Tu prueba gratuita de IA ya termino</p>
          <p className="mt-2 text-sm text-slate-600">
            Mejora tu plan para seguir usando el chat de estudio.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            Ver planes
          </Link>
        </CardSection>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <CardSection>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Conversaciones</h2>
              <p className="mt-1 text-sm text-slate-500">Historial guardado por usuario.</p>
            </div>
            <SecondaryButton type="button" onClick={() => void handleCreateConversation()}>
              Nueva
            </SecondaryButton>
          </div>

          <div className="mt-4 space-y-3">
            <Field label="Materia existente">
              <select
                value={selectedSubjectId}
                onChange={(event) => {
                  setSelectedSubjectId(event.target.value);
                  const selected = subjects.find((subject) => subject.id === event.target.value);
                  if (selected) {
                    setSubjectNameInput(selected.name);
                  }
                  setSelectedFileIds([]);
                }}
                className={inputClassName()}
              >
                <option value="">Sin materia</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nombre de materia">
              <input
                value={subjectNameInput}
                onChange={(event) => setSubjectNameInput(event.target.value)}
                placeholder="Escribi una materia nueva si todavia no existe"
                className={inputClassName()}
              />
            </Field>

            <Field label="Archivos o apuntes opcionales">
              <select
                multiple
                value={selectedFileIds}
                onChange={(event) =>
                  setSelectedFileIds(
                    Array.from(event.target.selectedOptions, (option) => option.value),
                  )}
                className={inputClassName("min-h-44")}
              >
                {filteredDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Cargar archivo desde aca">
              <input
                type="file"
                multiple
                onChange={handleInlineUpload}
                disabled={uploadingFile}
                className={inputClassName("pt-2")}
              />
            </Field>
            <p className="text-xs text-slate-500">
              Podes seleccionar varios archivos manteniendo `Ctrl` o `Cmd`.
            </p>

            {selectedFiles.length ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">
                  {selectedFiles.length} archivo(s) seleccionado(s)
                </p>
                <div className="mt-2 space-y-2">
                  {selectedFiles.map((selectedFile) => (
                    <p key={selectedFile.id}>
                      <span className="font-medium">{selectedFile.title}:</span>{" "}
                      {hasExtractedText(selectedFile)
                        ? "se usara el texto extraido como contexto."
                        : selectedFile.sourceText?.trim()
                          ? "se usara el apunte manual guardado como contexto."
                          : "todavia no tiene texto disponible para el chat."}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedFiles.length && !canUsePdfChat ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                El chat con archivos requiere el plan Pro.
              </div>
            ) : null}

            {loading ? (
              <EmptyState
                title="Cargando conversaciones"
                description="Estamos trayendo tu historial desde Supabase."
              />
            ) : conversations.length ? (
              conversations.map((conversation) => (
                <article
                  key={conversation.id}
                  className={`rounded-2xl border p-4 ${
                    conversation.id === selectedConversationId
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void loadConversation(conversation)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-semibold">{conversation.title}</p>
                    <p
                      className={`mt-2 text-xs ${
                        conversation.id === selectedConversationId
                          ? "text-slate-200"
                          : "text-slate-500"
                      }`}
                    >
                      {formatDate(conversation.updatedAt, true)}
                    </p>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <SecondaryButton
                      type="button"
                      onClick={() =>
                        void handleRenameConversation(conversation.id, conversation.title)
                      }
                    >
                      Renombrar
                    </SecondaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() => void handleDeleteConversation(conversation.id)}
                    >
                      Eliminar
                    </SecondaryButton>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                title="Todavia no hay conversaciones"
                description="Crea una nueva o envia tu primer mensaje para arrancar."
              />
            )}
          </div>
        </CardSection>

        <CardSection>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {selectedConversation?.title || "Nueva conversacion"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Historial reciente y respuestas guardadas por usuario.
              </p>
            </div>
          </div>

          {notice ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {!canUseChat && planId !== "expired_trial" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Para usar el chat de estudio necesitas el plan Pro.
            </div>
          ) : null}
          {uploadingFile ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              Cargando archivo...
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {messages.length ? (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-3xl px-4 py-3 text-sm ${
                    message.role === "assistant"
                      ? "mr-8 bg-slate-50 text-slate-700"
                      : "ml-8 bg-slate-900 text-white"
                  }`}
                >
                  <p className="font-semibold">
                    {message.role === "assistant" ? "Asistente" : "Tu"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`mt-2 text-xs ${
                      message.role === "assistant" ? "text-slate-400" : "text-slate-300"
                    }`}
                  >
                    {formatDate(message.createdAt, true)}
                    {message.role === "assistant" && message.totalTokens
                      ? ` - ${message.totalTokens} tokens`
                      : ""}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState
                title="Sin mensajes todavia"
                description="Hace una consulta para crear o continuar esta conversacion."
              />
            )}
          </div>

          <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
            <Field label="Tu pregunta">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className={inputClassName("min-h-32 resize-y")}
                placeholder="Pregunta algo sobre una materia, un apunte o un archivo."
              />
            </Field>
            <p className="text-xs text-slate-500">
              No hay busqueda semantica ni vectorial todavia. Para archivos largos, el contexto se recorta segun tu plan.
            </p>
            <PrimaryButton
              type="submit"
              disabled={
                sending
                || planId === "expired_trial"
                || !canUseChat
                || Boolean(selectedFileIds.length && !canUsePdfChat)
              }
            >
              {sending ? "Enviando..." : "Enviar mensaje"}
            </PrimaryButton>
          </form>
        </CardSection>
      </div>
    </div>
  );
}
