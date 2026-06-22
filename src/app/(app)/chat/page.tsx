"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
import { formatDate } from "@/lib/utils";
import { AiConversation, AiMessage } from "@/types";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    subjects,
    documents,
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
  const [selectedFileId, setSelectedFileId] = useState(searchParams.get("fileId") || "");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const aiState = user?.aiState;
  const planId = aiState?.planId || "expired_trial";
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const selectedFile = documents.find((document) => document.id === selectedFileId);
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

  async function loadConversation(conversation: AiConversation) {
    try {
      setSelectedConversationId(conversation.id);
      setSelectedSubjectId(conversation.subjectId || "");
      setSelectedFileId(conversation.fileId || "");
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
      const conversation = await createChatConversation({
        title: "Nueva conversación",
        subjectId: selectedSubjectId || undefined,
        fileId: selectedFileId || undefined,
      });
      await refreshConversations(conversation.id);
      setMessages([]);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo crear la conversación.",
      );
    }
  }

  async function handleRenameConversation(conversationId: string, currentTitle: string) {
    const nextTitle = window.prompt("Nuevo título para la conversación", currentTitle)?.trim();
    if (!nextTitle) return;

    try {
      setError("");
      await updateChatConversation(conversationId, { title: nextTitle });
      await refreshConversations(conversationId);
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : "No se pudo renombrar la conversación.",
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
          : "No se pudo eliminar la conversación.",
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
      const response = await sendChatMessage({
        conversationId: selectedConversationId || undefined,
        subjectId: selectedSubjectId || undefined,
        fileId: selectedFileId || undefined,
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
        description="Hacé preguntas sobre una materia, un PDF o un apunte y seguí la conversación desde un solo lugar."
        action={
          <PrimaryButton type="button" onClick={() => void handleCreateConversation()}>
            Nueva conversación
          </PrimaryButton>
        }
      />

      {planId === "expired_trial" ? (
        <CardSection>
          <p className="text-lg font-semibold text-slate-950">Tu prueba gratuita de IA ya terminó</p>
          <p className="mt-2 text-sm text-slate-600">
            Mejorá tu plan para seguir usando el chat de estudio.
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
            <Field label="Materia opcional">
              <select
                value={selectedSubjectId}
                onChange={(event) => {
                  setSelectedSubjectId(event.target.value);
                  setSelectedFileId("");
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

            <Field label="Archivo o apunte opcional">
              <select
                value={selectedFileId}
                onChange={(event) => setSelectedFileId(event.target.value)}
                className={inputClassName()}
              >
                <option value="">Sin archivo</option>
                {filteredDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </Field>

            {selectedFile ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {selectedFile.extractedText?.trim()
                  ? "Este chat usara el texto extraido del PDF como contexto."
                  : selectedFile.sourceText?.trim()
                    ? "Este chat usara el apunte manual guardado como contexto."
                  : "Ese archivo todavía no tiene texto disponible para el chat."}
              </div>
            ) : null}

            {selectedFile && !canUsePdfChat ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                El chat con PDF requiere el plan Pro.
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
                {selectedConversation?.title || "Nueva conversación"}
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
              Para usar el chat de estudio necesitás el plan Pro.
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
                title="Sin mensajes todavía"
                description="Haz una consulta para crear o continuar esta conversacion."
              />
            )}
          </div>

          <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
            <Field label="Tu pregunta">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className={inputClassName("min-h-32 resize-y")}
                placeholder="Preguntá algo sobre una materia, un apunte o un PDF."
              />
            </Field>
            <p className="text-xs text-slate-500">
              No hay búsqueda semántica ni vectorial todavía. Para PDFs largos, el contexto se recorta según tu plan.
            </p>
            <PrimaryButton
              type="submit"
              disabled={
                sending ||
                planId === "expired_trial" ||
                !canUseChat ||
                Boolean(selectedFileId && !canUsePdfChat)
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
