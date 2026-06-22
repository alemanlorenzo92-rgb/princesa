import { AiAccountState, AppDataState, Session, UserAccount } from "@/types";
import { STORAGE_KEYS } from "@/lib/constants";

const emptyDataState: AppDataState = {
  subjects: [],
  events: [],
  documents: [],
  materials: [],
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; Max-Age=0; SameSite=Lax`;
}

export const localDb = {
  getUsers() {
    return readJson<UserAccount[]>(STORAGE_KEYS.users, []);
  },
  saveUsers(users: UserAccount[]) {
    writeJson(STORAGE_KEYS.users, users);
  },
  getSession() {
    return readJson<Session | null>(STORAGE_KEYS.session, null);
  },
  saveSession(session: Session | null) {
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEYS.session);
      return;
    }
    writeJson(STORAGE_KEYS.session, session);
  },
  getAppData() {
    return readJson<AppDataState>(STORAGE_KEYS.data, emptyDataState);
  },
  saveAppData(data: AppDataState) {
    writeJson(STORAGE_KEYS.data, data);
  },
  syncServerReadableSession(session: Session | null, aiState?: AiAccountState | null) {
    if (!session) {
      clearCookie(STORAGE_KEYS.sessionCookie);
      clearCookie(STORAGE_KEYS.aiStateCookie);
      return;
    }

    setCookie(STORAGE_KEYS.sessionCookie, encodeURIComponent(JSON.stringify(session)));
    if (aiState) {
      setCookie(
        STORAGE_KEYS.aiStateCookie,
        encodeURIComponent(JSON.stringify({ userId: session.userId, aiState })),
      );
      return;
    }

    clearCookie(STORAGE_KEYS.aiStateCookie);
  },
};
