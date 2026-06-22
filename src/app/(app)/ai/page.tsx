"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
import { useAuth } from "@/hooks/use-auth";
import {
  estimateTokens,
  getCurrentMonthlyUsage,
  getRemainingMonthlyTokens,
  getRemainingTrialTokens,
} from "@/lib/ai-usage";
import { ABSOLUTE_SOURCE_TEXT_CHAR_LIMIT } from "@/lib/ai-config";
import {
  DETAIL_LEVEL_OPTIONS,
  MATERIAL_TYPE_OPTIONS,
  STYLE_OPTIONS,
} from "@/lib/constants";
import { exportMaterialToPdf } from "@/lib/pdf";
import { hasExtractedText } from "@/lib/services/study-files";
import { canUseFeature, getPlanConfig, isPaidPlan } from "@/lib/plans";
import { formatDate } from "@/lib/utils";
import { GenerateMaterialResponse } from "@/types";

export default function AiPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    subjects,
    documents,
    generateMaterial,
    saveMaterial,
    extractDocumentText,
  } = useAppData();
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [lastUsageMessage, setLastUsageMessage] = useState("");
  const [resultMeta, setResultMeta] = useState<{
    title: string;
    subjectId: string;
    documentId?: string;
    type: (typeof MATERIAL_TYPE_OPTIONS)[number]["value"];
    detailLevel: (typeof DETAIL_LEVEL_OPTIONS)[number]["value"];
    style: (typeof STYLE_OPTIONS)[number]["value"];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUsage, setLastUsage] = useState<GenerateMaterialResponse["usage"] | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    searchParams.get("subjectId") || "",
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState(
    searchParams.get("documentId") || "",
  );
  const [documentNotice, setDocumentNotice] = useState("");
  const [extractingDocumentId, setExtractingDocumentId] = useState<string | null>(null);

  const aiState = user?.aiState;
  const planId = aiState?.planId || "expired_trial";
  const planConfig = getPlanConfig(planId);
  const remainingTrial = aiState ? getRemainingTrialTokens(aiState) : null;
  const remainingMonthly = aiState ? getRemainingMonthlyTokens(aiState) : null;
  const monthlyUsage = aiState ? getCurrentMonthlyUsage(aiState) : null;
  const isBlocked = planId === "expired_trial";

  const availableFeatures = useMemo(
    () => new Set(planConfig.features),
    [planConfig.features],
  );
  const linkedDocument = documents.find((entry) => entry.id === selectedDocumentId);
  const subjectDocuments = selectedSubjectId
    ? documents.filter((entry) => entry.subjectId === selectedSubjectId)
    : documents;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subjectId = selectedSubjectId || String(formData.get("subjectId") || "");
    const documentId = selectedDocumentId || String(formData.get("documentId") || "");
    const manualText = String(formData.get("manualText") || "");
    const title = String(formData.get("title") || "");
    const type = String(formData.get("type") || "short_summary") as (typeof MATERIAL_TYPE_OPTIONS)[number]["value"];
    const detailLevel = String(formData.get("detailLevel") || "medium") as (typeof DETAIL_LEVEL_OPTIONS)[number]["value"];
    const style = String(formData.get("style") || "simple") as (typeof STYLE_OPTIONS)[number]["value"];
    const sourceText =
      manualText.trim() || linkedDocument?.extractedText || linkedDocument?.sourceText || "";

    if (isBlocked) {
      setError("Tu prueba gratuita termino. Mejora tu plan para seguir usando IA.");
      setResult("");
      return;
    }

    if (!sourceText.trim()) {
      setError(
        linkedDocument?.filePath
          ? "Ese PDF todavia no tiene texto extraido. Extraelo primero o usa texto manual."
          : "No hay texto suficiente. Pega contenido o elige un archivo con texto asociado.",
      );
      setResult("");
      return;
    }

    if (sourceText.length > ABSOLUTE_SOURCE_TEXT_CHAR_LIMIT) {
      setError(
        `El texto supera el maximo tecnico de ${ABSOLUTE_SOURCE_TEXT_CHAR_LIMIT} caracteres.`,
      );
      setResult("");
      return;
    }

    const estimatedInputTokens = estimateTokens(sourceText);
    if (estimatedInputTokens > planConfig.requestInputTokensLimit) {
      setError(
        planId === "trial"
          ? "El texto es demasiado largo para tu prueba gratuita."
          : "El texto es demasiado largo para tu plan actual.",
      );
      setResult("");
      return;
    }

    if (!canUseFeature(planId, type)) {
      setError(
        planId === "trial"
          ? "Esta funcion no esta disponible durante la prueba gratuita."
          : "Tu plan actual no incluye esta funcion.",
      );
      setResult("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setLastUsageMessage("");
      const response = await generateMaterial({
        subjectId,
        documentId: documentId || undefined,
        sourceText,
        materialType: type,
        detailLevel,
        style,
      });
      setResult(response.content);
      setLastUsageMessage(
        `Uso registrado: ${response.usage.inputTokens} tokens de entrada, ${response.usage.outputTokens} de salida, modelo ${response.usage.model}.`,
      );
      setLastUsage(response.usage);
      setResultMeta({
        title,
        subjectId,
        documentId: documentId || undefined,
        type,
        detailLevel,
        style,
      });
    } catch (generationError) {
      setResult("");
      setResultMeta(null);
      setLastUsageMessage("");
      setLastUsage(null);
      setError(
        generationError instanceof Error
          ? generationError.message
          : "No se pudo generar el material.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleExtractCurrentDocument() {
    if (!selectedDocumentId) return;

    try {
      setExtractingDocumentId(selectedDocumentId);
      setDocumentNotice("");
      const result = await extractDocumentText(selectedDocumentId);
      setDocumentNotice(
        result.warning
          ? result.warning
          : `Texto extraido correctamente. ${result.extractedTextLength} caracteres listos para IA.`,
      );
    } catch (extractError) {
      setDocumentNotice(
        extractError instanceof Error
          ? extractError.message
          : "No se pudo extraer texto del PDF seleccionado.",
      );
    } finally {
      setExtractingDocumentId(null);
    }
  }

  async function saveCurrentMaterial() {
    if (!resultMeta || !result) return;
    await saveMaterial({
      subjectId: resultMeta.subjectId,
      documentId: resultMeta.documentId,
      title: resultMeta.title,
      type: resultMeta.type,
      detailLevel: resultMeta.detailLevel,
      style: resultMeta.style,
      content: result,
      model: lastUsage?.model,
      inputTokens: lastUsage?.inputTokens,
      outputTokens: lastUsage?.outputTokens,
      totalTokens: lastUsage?.totalTokens,
    });
  }

  function exportCurrentMaterial() {
    if (!resultMeta || !result) return;
    const subject = subjects.find((entry) => entry.id === resultMeta.subjectId);
    exportMaterialToPdf({
      appName: "Proyecto Princesa",
      subjectName: subject?.name || "Materia sin nombre",
      title: resultMeta.title,
      createdAt: formatDate(new Date().toISOString()),
      content: result,
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="IA"
        title="Generador de material de estudio"
        description="Todo el uso de IA pasa por OpenAI API desde el backend y respeta el plan activo del usuario."
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <CardSection>
          <p className="text-sm text-slate-500">
            {planId === "trial"
              ? "Prueba gratuita de IA"
              : planConfig.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {planId === "expired_trial" ? "Tu prueba gratuita termino" : planConfig.label}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            {planId === "trial"
              ? "La prueba gratuita se entrega una sola vez, se consume progresivamente y no se renueva."
              : planId === "expired_trial"
                ? "Ya no tienes IA disponible sin un plan pago."
                : "Tus limites de IA se renuevan mensualmente mientras el plan este activo."}
          </p>
          {planId === "expired_trial" ? (
            <Link
              href="/settings"
              className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Mejorar plan
            </Link>
          ) : null}
        </CardSection>

        <CardSection>
          {planId === "trial" && remainingTrial ? (
            <>
              <p className="text-sm text-slate-500">Tokens de prueba</p>
              <p className="mt-2 text-sm text-slate-700">
                Entrada: {aiState?.trial?.trialInputTokensUsed || 0} / {aiState?.trial?.trialInputTokensLimit || 0}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Salida: {aiState?.trial?.trialOutputTokensUsed || 0} / {aiState?.trial?.trialOutputTokensLimit || 0}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Restantes: {remainingTrial.inputRemaining} entrada - {remainingTrial.outputRemaining} salida
              </p>
            </>
          ) : null}

          {isPaidPlan(planId) && remainingMonthly ? (
            <>
              <p className="text-sm text-slate-500">Uso mensual</p>
              <p className="mt-2 text-sm text-slate-700">
                Entrada: {monthlyUsage?.monthlyInputTokensUsed || 0} / {planConfig.monthlyInputTokensLimit}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Salida: {monthlyUsage?.monthlyOutputTokensUsed || 0} / {planConfig.monthlyOutputTokensLimit}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Restantes: {remainingMonthly.inputRemaining} entrada - {remainingMonthly.outputRemaining} salida
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Periodo: {monthlyUsage?.month || new Date().toISOString().slice(0, 7)}
              </p>
            </>
          ) : null}
        </CardSection>

        <CardSection>
          <p className="text-sm text-slate-500">Funciones disponibles</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {planConfig.features.length ? (
              planConfig.features.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {MATERIAL_TYPE_OPTIONS.find((entry) => entry.value === feature)?.label || feature}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No hay funciones habilitadas.</span>
            )}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Maximo por request: {planConfig.requestInputTokensLimit} tokens de entrada y {planConfig.requestOutputTokensLimit} de salida.
          </p>
        </CardSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Configurar generacion</h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <Field label="Titulo del material">
              <input name="title" required placeholder="Resumen parcial unidad 2" className={inputClassName()} />
            </Field>
            <Field label="Materia">
              <select
                name="subjectId"
                required
                value={selectedSubjectId}
                onChange={(event) => {
                  setSelectedSubjectId(event.target.value);
                  setSelectedDocumentId("");
                  setDocumentNotice("");
                }}
                className={inputClassName()}
              >
                <option value="" disabled>
                  Seleccionar materia
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Archivo asociado opcional">
              <select
                name="documentId"
                value={selectedDocumentId}
                onChange={(event) => {
                  setSelectedDocumentId(event.target.value);
                  setDocumentNotice("");
                }}
                className={inputClassName()}
              >
                <option value="">Sin archivo asociado</option>
                {subjectDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </Field>
            {linkedDocument ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{linkedDocument.title}</p>
                <p className="mt-2">
                  Prioridad de fuente: texto manual del formulario, luego `extracted_text`, y despues `manual_text` del archivo.
                </p>
                {hasExtractedText(linkedDocument) ? (
                  <p className="mt-2 text-slate-600">
                    Texto extraido disponible: {linkedDocument.extractedText?.length || 0} caracteres.
                  </p>
                ) : linkedDocument.filePath ? (
                  <p className="mt-2 text-amber-700">
                    Este PDF todavia no tiene texto extraido.
                  </p>
                ) : null}
                {!hasExtractedText(linkedDocument) && linkedDocument.sourceText ? (
                  <p className="mt-2 text-slate-600">
                    El archivo igual tiene texto manual guardado como alternativa.
                  </p>
                ) : null}
                {documentNotice ? <p className="mt-2 text-sky-700">{documentNotice}</p> : null}
                {linkedDocument.filePath && !hasExtractedText(linkedDocument) ? (
                  <SecondaryButton
                    type="button"
                    className="mt-3"
                    onClick={() => void handleExtractCurrentDocument()}
                    disabled={extractingDocumentId === linkedDocument.id}
                  >
                    {extractingDocumentId === linkedDocument.id
                      ? "Extrayendo..."
                      : "Extraer texto del PDF"}
                  </SecondaryButton>
                ) : null}
              </div>
            ) : null}
            <Field label="Tipo de material">
              <select name="type" defaultValue="short_summary" className={inputClassName()}>
                {MATERIAL_TYPE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={!availableFeatures.has(option.value)}
                  >
                    {option.label}
                    {!availableFeatures.has(option.value) ? " - no disponible" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nivel de detalle">
                <select name="detailLevel" defaultValue="medium" className={inputClassName()}>
                  {DETAIL_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estilo">
                <select name="style" defaultValue="simple" className={inputClassName()}>
                  {STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Texto base manual">
              <textarea
                name="manualText"
                placeholder="Si no eliges archivo, pega aqui el contenido de clase o tus apuntes."
                className={textareaClassName("min-h-56")}
              />
            </Field>
            <p className="text-xs text-slate-500">
              Estimacion rapida: aproximadamente 1 token cada 4 caracteres.
            </p>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <PrimaryButton type="submit" disabled={loading || isBlocked}>
              {loading ? "Generando..." : isBlocked ? "IA bloqueada" : "Generar material"}
            </PrimaryButton>
          </form>
        </CardSection>

        <CardSection>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Resultado generado</h2>
              <p className="mt-1 text-sm text-slate-500">Listo para revisar, guardar o exportar en PDF.</p>
            </div>
            {result ? (
              <div className="flex gap-2">
                <SecondaryButton type="button" onClick={saveCurrentMaterial}>
                  Guardar
                </SecondaryButton>
                <PrimaryButton type="button" onClick={exportCurrentMaterial}>
                  Descargar PDF
                </PrimaryButton>
              </div>
            ) : null}
          </div>

          {result ? (
            <div className="mt-5 space-y-3">
              {lastUsageMessage ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  {lastUsageMessage}
                </div>
              ) : null}
              <pre className="whitespace-pre-wrap rounded-3xl bg-slate-950 p-5 text-sm leading-7 text-slate-50">
                {result}
              </pre>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="Todavia no generaste material"
                description="Completa el formulario y obtendras materiales segun el plan y el cupo de IA disponible."
              />
            </div>
          )}
        </CardSection>
      </div>
    </div>
  );
}
