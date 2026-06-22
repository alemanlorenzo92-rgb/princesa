import "server-only";

import { STUDY_FILES_BUCKET } from "@/lib/services/storage-files";
import { createAdminClient } from "@/lib/supabase/admin";

type ConfigVisibility = "public" | "private";
type ConfigCategory =
  | "supabase"
  | "openai"
  | "mercadopago"
  | "storage"
  | "notifications";

export interface RuntimeConfigStatusItem {
  key: string;
  visibility: ConfigVisibility;
  category: ConfigCategory;
  configured: boolean;
}

const BASE_RUNTIME_CONFIG: RuntimeConfigStatusItem[] = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    visibility: "public",
    category: "supabase",
    configured: false,
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    visibility: "public",
    category: "supabase",
    configured: false,
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    visibility: "public",
    category: "supabase",
    configured: false,
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    visibility: "private",
    category: "supabase",
    configured: false,
  },
  {
    key: "OPENAI_API_KEY",
    visibility: "private",
    category: "openai",
    configured: false,
  },
  {
    key: "MERCADOPAGO_ACCESS_TOKEN",
    visibility: "private",
    category: "mercadopago",
    configured: false,
  },
  {
    key: "MERCADOPAGO_STUDENT_PRICE",
    visibility: "private",
    category: "mercadopago",
    configured: false,
  },
  {
    key: "MERCADOPAGO_PRO_PRICE",
    visibility: "private",
    category: "mercadopago",
    configured: false,
  },
  {
    key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    visibility: "public",
    category: "notifications",
    configured: false,
  },
  {
    key: "VAPID_PRIVATE_KEY",
    visibility: "private",
    category: "notifications",
    configured: false,
  },
  {
    key: "VAPID_SUBJECT",
    visibility: "private",
    category: "notifications",
    configured: false,
  },
];

async function getStorageStatus(): Promise<RuntimeConfigStatusItem> {
  const baseItem: RuntimeConfigStatusItem = {
    key: `bucket privado ${STUDY_FILES_BUCKET}`,
    visibility: "private",
    category: "storage",
    configured: false,
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return baseItem;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.getBucket(STUDY_FILES_BUCKET);

    if (error || !data?.name) {
      return baseItem;
    }

    return {
      ...baseItem,
      configured: true,
    };
  } catch {
    return baseItem;
  }
}

export async function getRuntimeConfigStatus() {
  const envStatus = BASE_RUNTIME_CONFIG.map((item) => ({
    ...item,
    configured: Boolean(process.env[item.key]),
  }));

  const storageStatus = await getStorageStatus();

  return [...envStatus, storageStatus];
}

export async function getSafeRuntimeConfigMessage() {
  const status = await getRuntimeConfigStatus();
  const missing = status.filter((item) => !item.configured);

  if (!missing.length) {
    return {
      ok: true,
      message: "La configuracion principal de produccion parece estar completa.",
      details: status,
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      ok: false,
      message: `Faltan variables de entorno: ${missing.map((item) => item.key).join(", ")}`,
      details: status,
    };
  }

  return {
    ok: false,
    message: "Faltan variables de entorno requeridas para produccion. Revisa la configuracion del servidor.",
    details: status.map((item) => ({
      ...item,
      key: item.visibility === "public" ? item.key : `${item.category}: variable privada`,
    })),
  };
}
