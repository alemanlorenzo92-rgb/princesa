"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { useMounted } from "@/hooks/use-mounted";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const onboardingDone = window.localStorage.getItem("estudioai_onboarding_done") === "true";
    if (!onboardingDone && pathname !== "/welcome") {
      router.replace(`/welcome?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, mounted, pathname, router, user]);

  if (!mounted || loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-xs rounded-3xl border border-white/60 bg-white/80 p-8 shadow-soft backdrop-blur">
          <p className="text-sm font-medium text-slate-500">Cargando tu espacio de estudio...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
