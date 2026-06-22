"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useId, useState } from "react";

import { CardSection } from "@/components/card-section";
import { EmptyState } from "@/components/empty-state";
import {
  Field,
  PrimaryButton,
  SecondaryButton,
  inputClassName,
  textareaClassName,
} from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { useAppData } from "@/hooks/use-app-data";
import { MAX_STUDY_PDF_SIZE_BYTES } from "@/lib/pdf-config";
import { hasExtractedText } from "@/lib/services/study-files";
import { validatePdfFile } from "@/lib/services/storage-files";
import { formatDate, truncateText } from "@/lib/utils";

export default function FilesPage() {
  const {
    subjects,
    documents,
    addDocument,
    deleteDocument,
    openDocument,
    extractDocumentText,
    loading,
    error,
  } = useAppData();
  const fileInputId = useId();
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [fileWarning, setFileWarning] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [extractingDocumentId, setExtractingDocumentId] = useState<string | null>(null);
  const [extractFeedback, setExtractFeedback] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedPdf(null);
      setFileWarning("");
      return;
    }

    try {
      validatePdfFile(file);
      setSelectedPdf(file);
      setSubmitError("");
      setFileWarning("Podras extraer el texto real del PDF una vez que termine la subida.");
    } catch (validationError) {
      setSelectedPdf(null);
      setFileWarning(
        validationError instanceof Error
          ? validationError.message
          : "No se pudo validar el PDF seleccionado.",
      );
      return;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const sourceText = String(formData.get("sourceText") || "").trim();
    const subjectId = String(formData.get("subjectId") || "");

    if (!selectedPdf && !sourceText) {
      setSubmitError("Carga un PDF o pega un apunte manual para guardar el material.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");

      await addDocument({
        subjectId,
        title: String(formData.get("title") || ""),
        description: String(formData.get("description") || ""),
        sourceText,
        extractedText: "",
        pdfFile: selectedPdf,
      });

      event.currentTarget.reset();
      setSelectedPdf(null);
      setFileWarning("");
    } catch (submissionError) {
      setSubmitError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo guardar el archivo en este momento.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOpenDocument(documentId: string) {
    try {
      setOpeningDocumentId(documentId);
      setSubmitError("");
      const signedUrl = await openDocument(documentId);

      if (!signedUrl) {
        throw new Error("Este material no tiene un PDF asociado para abrir.");
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setSubmitError(
        openError instanceof Error
          ? openError.message
          : "No se pudo abrir el PDF seleccionado.",
      );
    } finally {
      setOpeningDocumentId(null);
    }
  }

  async function handleExtractDocument(documentId: string) {
    try {
      setExtractingDocumentId(documentId);
      setExtractFeedback("");
      setSubmitError("");
      const result = await extractDocumentText(documentId);
      setExtractFeedback(
        result.warning
          ? `${result.warning} Vista previa: ${result.preview || "sin preview"}`
          : `Texto extraido correctamente. ${result.extractedTextLength} caracteres disponibles.`,
      );
    } catch (extractError) {
      setExtractFeedback(
        extractError instanceof Error
          ? extractError.message
          : "No se pudo extraer texto del PDF seleccionado.",
      );
    } finally {
      setExtractingDocumentId(null);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    try {
      setDeletingDocumentId(documentId);
      setSubmitError("");
      await deleteDocument(documentId);
    } catch (deleteError) {
      setSubmitError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el archivo seleccionado.",
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Archivos"
        title="PDFs y apuntes"
        description="Sube material de estudio o pega texto para reutilizarlo en el generador IA."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Cargar archivo o apunte</h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <Field label="Materia opcional">
              <select name="subjectId" defaultValue="" className={inputClassName()}>
                <option value="">Sin materia por ahora</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Titulo">
              <input name="title" required className={inputClassName()} />
            </Field>
            <Field label="Descripcion">
              <textarea name="description" className={textareaClassName()} />
            </Field>
            <Field label="PDF opcional">
              <input
                id={fileInputId}
                name="pdf"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className={inputClassName("pt-2")}
              />
            </Field>
            <Field label="Texto o apunte">
              <textarea
                name="sourceText"
                placeholder="Pega aqui texto del PDF, apuntes o fragmentos de clase. Si no subes PDF, este texto sigue funcionando como fuente para IA."
                className={textareaClassName("min-h-40")}
              />
            </Field>
            <p className="text-xs text-slate-500">
              PDFs privados en Supabase Storage. Solo se aceptan `application/pdf` y hasta{" "}
              {Math.floor(MAX_STUDY_PDF_SIZE_BYTES / 1024 / 1024)} MB.
            </p>
            {fileWarning ? <p className="text-sm text-amber-700">{fileWarning}</p> : null}
            {extractFeedback ? <p className="text-sm text-sky-700">{extractFeedback}</p> : null}
            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar material fuente"}
            </PrimaryButton>
          </form>
        </CardSection>

        <div className="space-y-4">
          {error ? <EmptyState title="No se pudieron cargar los archivos" description={error} /> : null}
          {!error && loading ? (
            <EmptyState title="Cargando archivos" description="Estamos trayendo tus apuntes y PDFs desde Supabase." />
          ) : null}
          {!error && !loading && documents.length
            ? documents.map((document) => {
                const subject = subjects.find((entry) => entry.id === document.subjectId);

                return (
                  <CardSection key={document.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">{document.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {subject?.name || "Sin materia"} - {formatDate(document.createdAt)}
                        </p>
                        <p className="mt-3 text-sm text-slate-600">
                          {truncateText(document.description || "Sin descripcion")}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {document.filePath
                            ? `PDF privado: ${document.fileName || "archivo.pdf"}`
                            : "Apunte manual"}{" "}
                          -{" "}
                          {hasExtractedText(document)
                            ? "Texto extraido listo"
                            : document.filePath
                              ? "Sin texto extraido"
                              : "Listo para usar con texto manual"}
                        </p>
                        {document.filePath && !hasExtractedText(document) ? (
                          <p className="mt-2 text-sm text-amber-700">
                            Este PDF todavia no tiene texto extraido.
                          </p>
                        ) : null}
                        {hasExtractedText(document) ? (
                          <p className="mt-2 text-sm text-slate-500">
                            Texto extraido: {document.extractedText?.length || 0} caracteres.
                          </p>
                        ) : null}
                        {document.extractedText ? (
                          <p className="mt-2 text-sm text-slate-500">
                            Preview: {truncateText(document.extractedText, 180)}
                          </p>
                        ) : null}
                        {document.sourceText ? (
                          <p className="mt-2 text-sm text-slate-500">
                            Texto manual: {truncateText(document.sourceText, 110)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        {document.filePath || document.fileDataUrl ? (
                          <SecondaryButton
                            type="button"
                            onClick={() => void handleOpenDocument(document.id)}
                            disabled={openingDocumentId === document.id}
                          >
                            {openingDocumentId === document.id ? "Abriendo..." : "Abrir PDF"}
                          </SecondaryButton>
                        ) : null}
                        {document.filePath ? (
                          <SecondaryButton
                            type="button"
                            onClick={() => void handleExtractDocument(document.id)}
                            disabled={extractingDocumentId === document.id}
                          >
                            {extractingDocumentId === document.id
                              ? "Extrayendo..."
                              : hasExtractedText(document)
                                ? "Reextraer texto"
                                : "Extraer texto"}
                          </SecondaryButton>
                        ) : null}
                        <Link
                          href={
                            document.subjectId || document.id
                              ? `/chat?subjectId=${document.subjectId || ""}&fileId=${document.id}`
                              : "/chat"
                          }
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                        >
                          Chatear
                        </Link>
                        <SecondaryButton
                          type="button"
                          onClick={() => void handleDeleteDocument(document.id)}
                          disabled={deletingDocumentId === document.id}
                        >
                          {deletingDocumentId === document.id ? "Eliminando..." : "Eliminar"}
                        </SecondaryButton>
                      </div>
                    </div>
                  </CardSection>
                );
              })
            : null}
          {!error && !loading && !documents.length ? (
            <EmptyState
              title="No hay archivos cargados"
              description="Sube un PDF o pega un apunte para usarlo luego en el generador."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
