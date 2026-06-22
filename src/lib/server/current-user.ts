import "server-only";

import { cookies } from "next/headers";

import { STORAGE_KEYS } from "@/lib/constants";
import { AiAccountState, Session } from "@/types";

export async function getServerSession() {
  const store = await cookies();
  const raw = store.get(STORAGE_KEYS.sessionCookie)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw)) as Session;
  } catch {
    return null;
  }
}

export async function getServerAiState() {
  const store = await cookies();
  const raw = store.get(STORAGE_KEYS.aiStateCookie)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw)) as {
      userId: string;
      aiState: AiAccountState;
    };
  } catch {
    return null;
  }
}
