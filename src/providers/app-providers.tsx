"use client";

import { AppDataProvider } from "@/providers/app-data-provider";
import { AuthProvider } from "@/providers/auth-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppDataProvider>{children}</AppDataProvider>
    </AuthProvider>
  );
}
