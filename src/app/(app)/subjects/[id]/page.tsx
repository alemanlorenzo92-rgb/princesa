"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CardSection } from "@/components/card-section";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useAppData } from "@/hooks/use-app-data";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { hasExtractedText } from "@/lib/services/study-files";
import {
  canExtractTextFromStudyFile,
  getStudyFileDisplayLabel,
} from "@/lib/study-file-config";
import { formatDate, truncateText } from "@/lib/utils";

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    subjects,
    events,
    documents,
    materials,
    openDocument,
    extractDocumentText,
    loading,
    error,
  } = useAppData();
  const subject = subjects.find((entry) => entry.id === id);
  const [documentError, setDocumentError] = useState("");
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [extractingDocumentId, setExtractingDocumentId] = useState<string | null>(null);
  const [extractFeedback, setExtractFeedback] = useState("");

  if (loading) {
    return (
      <div>
        <PageHeader
          eyebrow="Detalle"
          title="Cargando materia"
          description="Estamos trayendo el detalle desde Supabase."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Detalle" title="No se pudo cargar la materia" description={error} />
      </div>
    );
  }

  if (!subject) {
    notFound();
  }

  const subjectEvents = events.filter((entry) => entry.subjectId === subject.id);
  const subjectDocuments = documents.filter((entry) => entry.subjectId === subject.id);
  const subjectMaterials = materials.filter((entry) => entry.subjectId === subject.id);

  async function handleOpenDocument(documentId: string) {
    try {
      setOpeningDocumentId(documentId);
      setDocumentError("");
      const signedUrl = await openDocument(documentId);

      if (!signedUrl) {
        throw new Error("Este material no tiene un archivo asociado para abrir.");
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setDocumentError(
        openError instanceof Error
          ? openError.message
          : "No se pudo abrir el archivo seleccionado.",
      );
    } finally {
      setOpeningDocumentId(null);
    }
  }

  async function handleExtractDocument(documentId: string) {
    try {
      setExtractingDocumentId(documentId);
      setDocumentError("");
      const result = await extractDocumentText(documentId);
      setExtractFeedback(
        result.warning
          ? result.warning
          : `Texto extraido correctamente. ${result.extractedTextLength} caracteres disponibles.`,
      );
    } catch (extractError) {
      setDocumentError(
        extractError instanceof Error
          ? extractError.message
          : "No se pudo extraer texto del archivo seleccionado.",
      );
    } finally {
      setExtractingDocumentId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Detalle"
        title={subject.name}
        description={subject.description || "Sin descripcion cargada para esta materia."}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <CardSection>
          <p className="text-sm text-slate-500">Profesor</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{subject.professor || "Sin cargar"}</p>
          <p className="mt-4 text-sm text-slate-500">Horario</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{subject.schedule || "Sin cargar"}</p>
          <Link
            href={`/chat?subjectId=${subject.id}`}
            className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Chatear sobre esta materia
          </Link>
        </CardSection>
        <CardSection>
          <p className="text-sm text-slate-500">Eventos vinculados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{subjectEvents.length}</p>
        </CardSection>
        <CardSection>
          <p className="text-sm text-slate-500">Materiales guardados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{subjectMaterials.length}</p>
        </CardSection>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <CardSection className="xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-950">Proximas fechas</h2>
          <div className="mt-4 space-y-3">
            {subjectEvents.length ? (
              subjectEvents.map((event) => (
                <article key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {EVENT_TYPE_LABELS[event.type]}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    {formatDate(event.date)}
                    {event.time ? ` - ${event.time}` : ""}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState
                title="Sin eventos asociados"
                description="Agrega examenes o entregas desde la pantalla de calendario."
              />
            )}
          </div>
        </CardSection>

        <CardSection className="xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-950">Archivos y apuntes</h2>
          {documentError ? <p className="mt-3 text-sm text-red-600">{documentError}</p> : null}
          {extractFeedback ? <p className="mt-3 text-sm text-sky-700">{extractFeedback}</p> : null}
          <div className="mt-4 space-y-3">
            {subjectDocuments.length ? (
              subjectDocuments.map((document) => {
                const canExtractText = canExtractTextFromStudyFile({
                  fileName: document.fileName,
                  fileType: document.fileType,
                });

                return (
                  <article key={document.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{document.title}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {truncateText(document.description || "Sin descripcion")}
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      {document.filePath
                        ? `${getStudyFileDisplayLabel({
                          fileName: document.fileName,
                          fileType: document.fileType,
                          hasStoredFile: true,
                        })}: ${document.fileName || "archivo"}`
                        : "Apunte manual asociado"}
                    </p>
                    {document.filePath && !hasExtractedText(document) ? (
                      <p className="mt-2 text-sm text-amber-700">
                        {canExtractText
                          ? "Este archivo todavia no tiene texto extraido."
                          : "Este formato se guardo correctamente, pero no admite extraccion automatica por ahora."}
                      </p>
                    ) : null}
                    {hasExtractedText(document) ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Texto extraido disponible: {document.extractedText?.length || 0} caracteres.
                      </p>
                    ) : null}
                    {document.extractedText ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Preview: {truncateText(document.extractedText, 180)}
                      </p>
                    ) : null}
                    {document.sourceText ? (
                      <p className="mt-2 text-sm text-slate-500">
                        {truncateText(document.sourceText, 110)}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {document.filePath || document.fileDataUrl ? (
                        <button
                          type="button"
                          onClick={() => void handleOpenDocument(document.id)}
                          disabled={openingDocumentId === document.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                        >
                          {openingDocumentId === document.id ? "Abriendo..." : "Abrir archivo"}
                        </button>
                      ) : null}
                      {document.filePath ? (
                        <button
                          type="button"
                          onClick={() => void handleExtractDocument(document.id)}
                          disabled={extractingDocumentId === document.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {extractingDocumentId === document.id
                            ? "Extrayendo..."
                            : hasExtractedText(document)
                              ? "Reextraer texto"
                              : "Extraer texto"}
                        </button>
                      ) : null}
                      <Link
                        href={`/chat?subjectId=${subject.id}&fileId=${document.id}`}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      >
                        Chatear sobre este archivo
                      </Link>
                      <Link
                        href={
                          hasExtractedText(document) || document.sourceText
                            ? `/ai?subjectId=${subject.id}&documentId=${document.id}`
                            : "/ai"
                        }
                        className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Generar material
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState
                title="No hay archivos cargados"
                description="Sube un archivo o pega texto desde la seccion Archivos."
              />
            )}
          </div>
        </CardSection>

        <CardSection className="xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-950">Materiales generados</h2>
          <div className="mt-4 space-y-3">
            {subjectMaterials.length ? (
              subjectMaterials.map((material) => (
                <article key={material.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{material.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{truncateText(material.content)}</p>
                </article>
              ))
            ) : (
              <EmptyState
                title="Todavia no hay material IA"
                description="Genera un resumen o guia desde la pantalla IA."
              />
            )}
          </div>
        </CardSection>
      </div>
    </div>
  );
}
