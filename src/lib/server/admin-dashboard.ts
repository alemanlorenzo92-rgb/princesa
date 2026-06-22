import "server-only";

import { getUsageMonth } from "@/lib/ai-usage";
import { resolveUserRole } from "@/lib/server/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AiMonthlyUsageRecord,
  AiTrialRecord,
  BillingEventRecord,
  PlanId,
  ProfileRecord,
  SubscriptionRecord,
  UserRole,
} from "@/types";

interface AuthUserSummary {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  planId: PlanId;
  subscriptionStatus: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  currentPeriodEnd: string | null;
  monthlyTokensUsed: number;
  monthlyOpenAiUses: number;
  monthlyEstimatedCostUsd: number;
  trialStatus: string | null;
  trialTokensUsed: number;
}

export interface AdminUsageRow {
  userId: string;
  email: string;
  name: string;
  planId: PlanId;
  totalTokens: number;
  openAiUses: number;
  estimatedCostUsd: number;
  lastUsedAt: string | null;
}

export interface AdminBillingRow {
  id: string;
  email: string;
  planId: string;
  status: string;
  provider: string;
  paymentId: string | null;
  createdAt: string;
}

export interface AdminActivityRow {
  id: string;
  email: string;
  planId: string;
  featureKey: string;
  model: string;
  totalTokens: number;
  estimatedCostUsd: number;
  createdAt: string;
}

export interface AdminDashboardData {
  month: string;
  summary: {
    totalUsers: number;
    adminUsers: number;
    signInsLast7Days: number;
    currentMonthTokens: number;
    currentMonthOpenAiUses: number;
    currentMonthEstimatedCostUsd: number;
    totalMaterialsGenerated: number;
    totalFilesUploaded: number;
    planCounts: Record<PlanId, number>;
  };
  users: AdminUserRow[];
  recentLogins: AdminUserRow[];
  topUsage: AdminUsageRow[];
  recentBilling: AdminBillingRow[];
  recentActivity: AdminActivityRow[];
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function toAuthUserSummary(user: Record<string, unknown>): AuthUserSummary {
  return {
    id: String(user.id || ""),
    email: String(user.email || ""),
    created_at: String(user.created_at || ""),
    last_sign_in_at:
      typeof user.last_sign_in_at === "string" ? user.last_sign_in_at : null,
    email_confirmed_at:
      typeof user.email_confirmed_at === "string" ? user.email_confirmed_at : null,
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createAdminClient();
  const month = getUsageMonth();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const [
    profilesResult,
    subscriptionsResult,
    currentMonthUsageResult,
    trialsResult,
    billingResult,
    activityResult,
    materialsResult,
    filesResult,
    authUsersResult,
  ] = await Promise.all([
    admin.from("profiles").select("*").returns<ProfileRecord[]>(),
    admin.from("subscriptions").select("*").returns<SubscriptionRecord[]>(),
    admin
      .from("ai_monthly_usage")
      .select("*")
      .eq("month", month)
      .returns<AiMonthlyUsageRecord[]>(),
    admin.from("ai_trials").select("*").returns<AiTrialRecord[]>(),
    admin
      .from("billing_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<BillingEventRecord[]>(),
    admin
      .from("ai_usage_logs")
      .select("id, user_id, plan_id, feature_key, model, total_tokens, estimated_cost_usd, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    admin.from("generated_materials").select("id", { count: "exact", head: true }),
    admin.from("study_files").select("id", { count: "exact", head: true }),
    admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    }),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;
  if (currentMonthUsageResult.error) throw currentMonthUsageResult.error;
  if (trialsResult.error) throw trialsResult.error;
  if (billingResult.error) throw billingResult.error;
  if (activityResult.error) throw activityResult.error;
  if (materialsResult.error) throw materialsResult.error;
  if (filesResult.error) throw filesResult.error;
  if (authUsersResult.error) throw authUsersResult.error;

  const profiles = profilesResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const currentMonthUsage = currentMonthUsageResult.data || [];
  const trials = trialsResult.data || [];
  const billingEvents = billingResult.data || [];
  const activityRows =
    ((activityResult.data || []) as Array<{
      id: string;
      user_id: string;
      plan_id: string | null;
      feature_key: string | null;
      model: string | null;
      total_tokens: number | null;
      estimated_cost_usd: number | null;
      created_at: string;
    }>) || [];
  const authUsers = (authUsersResult.data.users || []).map((user) =>
    toAuthUserSummary(user as unknown as Record<string, unknown>),
  );

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.user_id, subscription]));
  const currentMonthUsageMap = new Map(currentMonthUsage.map((entry) => [entry.user_id, entry]));
  const trialMap = new Map(trials.map((trial) => [trial.user_id, trial]));
  const authUserMap = new Map(authUsers.map((user) => [user.id, user]));

  const allUserIds = new Set<string>([
    ...profiles.map((profile) => profile.id),
    ...subscriptions.map((subscription) => subscription.user_id),
    ...currentMonthUsage.map((entry) => entry.user_id),
    ...trials.map((trial) => trial.user_id),
    ...authUsers.map((user) => user.id),
  ]);

  const users = Array.from(allUserIds)
    .map((userId): AdminUserRow => {
      const profile = profileMap.get(userId) || null;
      const subscription = subscriptionMap.get(userId) || null;
      const monthUsage = currentMonthUsageMap.get(userId) || null;
      const trial = trialMap.get(userId) || null;
      const authUser = authUserMap.get(userId) || null;
      const email = profile?.email || authUser?.email || "Sin email";
      const role = resolveUserRole(email, profile?.role);

      return {
        id: userId,
        email,
        name: profile?.full_name || email.split("@")[0] || "Usuario",
        role,
        planId: subscription?.plan_id || "expired_trial",
        subscriptionStatus: subscription?.status || "sin estado",
        createdAt: profile?.created_at || authUser?.created_at || new Date(0).toISOString(),
        lastSignInAt: authUser?.last_sign_in_at || null,
        emailConfirmedAt: authUser?.email_confirmed_at || null,
        currentPeriodEnd: subscription?.current_period_end || null,
        monthlyTokensUsed: monthUsage?.total_tokens_used || 0,
        monthlyOpenAiUses: monthUsage?.openai_uses || 0,
        monthlyEstimatedCostUsd: Number(monthUsage?.estimated_cost_usd || 0),
        trialStatus: trial?.status || null,
        trialTokensUsed: trial?.total_tokens_used || 0,
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const recentLogins = [...users]
    .filter((user) => Boolean(user.lastSignInAt))
    .sort((left, right) => (right.lastSignInAt || "").localeCompare(left.lastSignInAt || ""))
    .slice(0, 10);

  const topUsage = users
    .filter((user) => user.monthlyTokensUsed > 0 || user.trialTokensUsed > 0)
    .map((user) => ({
      userId: user.id,
      email: user.email,
      name: user.name,
      planId: user.planId,
      totalTokens:
        user.planId === "trial" || user.planId === "expired_trial"
          ? user.trialTokensUsed
          : user.monthlyTokensUsed,
      openAiUses: user.monthlyOpenAiUses,
      estimatedCostUsd: user.monthlyEstimatedCostUsd,
      lastUsedAt: currentMonthUsageMap.get(user.id)?.last_used_at || null,
    }))
    .sort((left, right) => right.totalTokens - left.totalTokens)
    .slice(0, 10);

  const recentBilling = billingEvents.map((entry) => ({
    id: entry.id,
    email:
      (entry.user_id ? profileMap.get(entry.user_id)?.email : null) ||
      (entry.user_id ? authUserMap.get(entry.user_id)?.email : null) ||
      "Sin usuario",
    planId: entry.plan_id || "-",
    status: entry.status || "-",
    provider: entry.provider,
    paymentId: entry.provider_payment_id,
    createdAt: entry.created_at,
  }));

  const recentActivity = activityRows.map((entry) => ({
    id: entry.id,
    email:
      profileMap.get(entry.user_id)?.email ||
      authUserMap.get(entry.user_id)?.email ||
      "Sin usuario",
    planId: entry.plan_id || "-",
    featureKey: entry.feature_key || "-",
    model: entry.model || "-",
    totalTokens: entry.total_tokens || 0,
    estimatedCostUsd: Number(entry.estimated_cost_usd || 0),
    createdAt: entry.created_at,
  }));

  const planCounts: Record<PlanId, number> = {
    trial: 0,
    student: 0,
    pro: 0,
    expired_trial: 0,
  };

  for (const user of users) {
    planCounts[user.planId] += 1;
  }

  const adminUsers = users.filter((user) => user.role === "admin").length;
  const signInsLast7Days = users.filter((user) => {
    if (!user.lastSignInAt) return false;
    return new Date(user.lastSignInAt).getTime() >= sevenDaysAgo;
  }).length;

  return {
    month,
    summary: {
      totalUsers: users.length,
      adminUsers,
      signInsLast7Days,
      currentMonthTokens: sum(currentMonthUsage.map((entry) => entry.total_tokens_used || 0)),
      currentMonthOpenAiUses: sum(currentMonthUsage.map((entry) => entry.openai_uses || 0)),
      currentMonthEstimatedCostUsd: sum(
        currentMonthUsage.map((entry) => Number(entry.estimated_cost_usd || 0)),
      ),
      totalMaterialsGenerated: materialsResult.count || 0,
      totalFilesUploaded: filesResult.count || 0,
      planCounts,
    },
    users: users.slice(0, 12),
    recentLogins,
    topUsage,
    recentBilling,
    recentActivity,
  };
}
