import {
  DetailLevel,
  MaterialStyle,
  ReminderUnit,
  StudyMaterialType,
} from "@/types";

export const STORAGE_KEYS = {
  users: "princesa-users",
  session: "princesa-session",
  data: "princesa-data",
  sessionCookie: "princesa-session-cookie",
  aiStateCookie: "princesa-ai-state",
} as const;

export const SUBJECT_COLORS = [
  "#FF8A65",
  "#4DB6AC",
  "#64B5F6",
  "#9575CD",
  "#F6BF26",
  "#81C784",
  "#F06292",
  "#26C6DA",
  "#FFD54F",
  "#A1887F",
  "#7986CB",
  "#AED581",
  "#FFB74D",
  "#90A4AE",
  "#E57373",
];

export const MATERIAL_TYPE_OPTIONS: Array<{
  value: StudyMaterialType;
  label: string;
}> = [
  { value: "short_summary", label: "Resumen corto" },
  { value: "full_summary", label: "Resumen completo" },
  { value: "key_concepts", label: "Conceptos importantes" },
  { value: "comparison_chart", label: "Cuadro comparativo" },
  { value: "outline", label: "Esquema" },
  { value: "concept_map", label: "Mapa conceptual" },
  { value: "q_and_a", label: "Preguntas y respuestas" },
  { value: "flashcards", label: "Flashcards" },
  { value: "study_guide", label: "Guia de estudio" },
  { value: "mock_exam", label: "Simulacro de examen" },
  { value: "simple_explanation", label: "Explicacion simple" },
  { value: "detailed_explanation", label: "Explicacion detallada" },
  { value: "key_topics", label: "Temas clave" },
  { value: "glossary", label: "Glosario" },
  { value: "timeline", label: "Linea de tiempo" },
];

export const DETAIL_LEVEL_OPTIONS: Array<{ value: DetailLevel; label: string }> =
  [
    { value: "low", label: "Bajo" },
    { value: "medium", label: "Medio" },
    { value: "high", label: "Alto" },
  ];

export const STYLE_OPTIONS: Array<{ value: MaterialStyle; label: string }> = [
  { value: "simple", label: "Simple" },
  { value: "academic", label: "Academico" },
  { value: "easy", label: "Muy facil de entender" },
];

export const EVENT_TYPE_LABELS = {
  exam: "Examen",
  assignment: "Trabajo practico",
  delivery: "Entrega",
  class: "Clase importante",
  custom: "Personalizado",
} as const;

export const PRIORITY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
} as const;

export const STATUS_LABELS = {
  pending: "Pendiente",
  completed: "Completado",
  overdue: "Vencido",
} as const;

export const REMINDER_OPTIONS: Array<{
  value: number;
  label: string;
}> = [
  { value: 0, label: "En el momento" },
  { value: 10, label: "10 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 dia antes" },
  { value: 2880, label: "2 dias antes" },
  { value: 4320, label: "3 dias antes" },
  { value: 10080, label: "7 dias antes" },
];

export const REMINDER_UNIT_LABELS: Record<ReminderUnit, string> = {
  minutes: "minutos",
  hours: "horas",
  days: "dias",
};

export function formatReminderOffsetMinutes(value: number) {
  const directOption = REMINDER_OPTIONS.find((option) => option.value === value);

  if (directOption) {
    return directOption.label;
  }

  if (value % 1440 === 0) {
    const days = value / 1440;
    return `${days} ${days === 1 ? "dia" : "dias"} antes`;
  }

  if (value % 60 === 0) {
    const hours = value / 60;
    return `${hours} ${hours === 1 ? "hora" : "horas"} antes`;
  }

  return `${value} ${value === 1 ? "minuto" : "minutos"} antes`;
}
