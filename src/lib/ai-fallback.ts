import {
  DetailLevel,
  MaterialStyle,
  StudyMaterialType,
} from "@/types";

export function buildFallbackMaterial({
  sourceText,
  subjectName,
  materialType,
  detailLevel,
  style,
}: {
  sourceText: string;
  subjectName: string;
  materialType: StudyMaterialType;
  detailLevel: DetailLevel;
  style: MaterialStyle;
}) {
  const snippet = sourceText.trim().replace(/\s+/g, " ").slice(0, 1400);
  const intro =
    style === "academic"
      ? "Enfoque academico, preciso y bien estructurado."
      : style === "easy"
        ? "Lenguaje muy claro y amigable para estudiar rapido."
        : "Explicacion simple, ordenada y directa.";

  const depth =
    detailLevel === "high"
      ? "Incluye bastante desarrollo y conexiones entre ideas."
      : detailLevel === "medium"
        ? "Profundidad intermedia para repasar con contexto."
        : "Formato breve para una lectura rapida.";

  return [
    `Material generado para ${subjectName}`,
    "",
    `Tipo solicitado: ${materialType}`,
    intro,
    depth,
    "",
    "Puntos principales",
    "1. Identifica las ideas centrales del texto base.",
    "2. Resume definiciones, procesos y relaciones importantes.",
    "3. Marca donde faltan datos o ejemplos en el material original.",
    "",
    "Desarrollo",
    snippet || "No se recibio contenido suficiente para generar el material.",
    "",
    "Siguiente paso sugerido",
    "Converti este material en preguntas, flashcards o un simulacro de examen para seguir estudiando.",
  ].join("\n");
}
