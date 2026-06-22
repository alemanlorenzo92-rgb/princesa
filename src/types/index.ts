export type Priority = "low" | "medium" | "high";
export type EventStatus = "pending" | "completed" | "overdue";
export type EventType =
  | "exam"
  | "assignment"
  | "delivery"
  | "class"
  | "custom";

export type StudyMaterialType =
  | "short_summary"
  | "full_summary"
  | "key_concepts"
  | "comparison_chart"
  | "outline"
  | "concept_map"
  | "q_and_a"
  | "flashcards"
  | "study_guide"
  | "mock_exam"
  | "simple_explanation"
  | "detailed_explanation"
  | "key_topics"
  | "glossary"
  | "timeline";

export type DetailLevel = "low" | "medium" | "high";
export type MaterialStyle = "simple" | "academic" | "easy";
export type PlanId = "trial" | "student" | "pro" | "expired_trial";
export type TrialStatus = "active" | "used" | "expired";
export type FeatureKey =
  | StudyMaterialType
  | "ai_chat"
  | "pdf_chat";
export type AiMessageRole = "user" | "assistant";

export interface TrialUsage {
  userId: string;
  trialStartedAt: string;
  trialInputTokensLimit: number;
  trialOutputTokensLimit: number;
  trialInputTokensUsed: number;
  trialOutputTokensUsed: number;
  trialTotalTokensUsed: number;
  trialOpenAiUses: number;
  trialFinishedAt?: string;
  trialStatus: TrialStatus;
}

export interface MonthlyPlanUsage {
  userId: string;
  month: string;
  planId: Extract<PlanId, "student" | "pro">;
  monthlyInputTokensUsed: number;
  monthlyOutputTokensUsed: number;
  monthlyTotalTokensUsed: number;
  monthlyOpenAiUses: number;
  estimatedCostUsd: number;
  lastUsedAt?: string;
  lastModelUsed?: string;
}

export interface AiAccountState {
  planId: PlanId;
  trial: TrialUsage | null;
  monthlyUsage: MonthlyPlanUsage[];
  currentModel?: string;
  lastAiUsedAt?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  aiState: AiAccountState;
}

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: PlanId;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingEventRecord {
  id: string;
  user_id: string | null;
  plan_id: PlanId | null;
  provider: string;
  provider_event_id: string | null;
  provider_payment_id: string | null;
  status: string | null;
  raw_event: Record<string, unknown> | null;
  created_at: string;
}

export interface AiTrialRecord {
  id: string;
  user_id: string;
  status: TrialStatus;
  input_tokens_limit: number;
  output_tokens_limit: number;
  input_tokens_used: number;
  output_tokens_used: number;
  total_tokens_used: number;
  openai_uses: number;
  started_at: string;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiMonthlyUsageRecord {
  id: string;
  user_id: string;
  month: string;
  plan_id: Extract<PlanId, "student" | "pro">;
  input_tokens_used: number;
  output_tokens_used: number;
  total_tokens_used: number;
  openai_uses: number;
  estimated_cost_usd: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  teacher: string | null;
  schedule: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademicEventRecord {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  type: EventType | null;
  event_date: string;
  event_time: string | null;
  priority: Priority | null;
  status: EventStatus | null;
  created_at: string;
  updated_at: string;
}

export interface StudyFileRecord {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  file_url: string | null;
  file_path: string | null;
  original_filename: string | null;
  extracted_text: string | null;
  manual_text: string | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedMaterialRecord {
  id: string;
  user_id: string;
  subject_id: string | null;
  file_id: string | null;
  title: string;
  material_type: StudyMaterialType | null;
  detail_level: DetailLevel | null;
  style: MaterialStyle | null;
  content: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  created_at: string;
  updated_at: string;
}

export interface AiConversationRecord {
  id: string;
  user_id: string;
  subject_id: string | null;
  file_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessageRecord {
  id: string;
  user_id: string;
  conversation_id: string;
  role: AiMessageRole;
  content: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  created_at: string;
}

export interface Session {
  userId: string;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  description: string;
  professor: string;
  schedule: string;
  color: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  description: string;
  type: EventType;
  date: string;
  time?: string;
  priority: Priority;
  status: EventStatus;
  createdAt: string;
}

export interface StudyDocument {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  description: string;
  fileName?: string;
  fileDataUrl?: string;
  filePath?: string;
  fileType?: string;
  sourceText?: string;
  extractedText?: string;
  createdAt: string;
}

export interface ExtractStudyFileTextResponse {
  success: boolean;
  extractedTextLength: number;
  preview?: string;
  warning?: string;
}

export interface StudyMaterial {
  id: string;
  userId: string;
  subjectId: string;
  documentId?: string;
  title: string;
  type: StudyMaterialType;
  detailLevel: DetailLevel;
  style: MaterialStyle;
  content: string;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  subjectId?: string;
  fileId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  userId: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  createdAt: string;
}

export interface AppDataState {
  subjects: Subject[];
  events: CalendarEvent[];
  documents: StudyDocument[];
  materials: StudyMaterial[];
}

export interface GenerateMaterialResponse {
  content: string;
  mode: "openai";
  aiState: AiAccountState;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
}

export interface SendChatMessageResponse {
  conversationId: string;
  assistantMessage: AiMessage;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextWarning?: string;
  aiState: AiAccountState;
}
