"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Home,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = [
    { href: "/dashboard", label: "Inicio", icon: Home },
    { href: "/subjects", label: "Materias", icon: BookOpen },
    { href: "/calendar", label: "Fechas", icon: CalendarDays },
    { href: "/study", label: "Estudio", icon: Sparkles },
    ...(user?.isAdmin
      ? [{ href: "/admin", label: "Admin", icon: Shield }]
      : []),
    { href: "/settings", label: "Perfil", icon: Settings },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col bg-[radial-gradient(circle_at_top,_rgba(248,244,239,0.9),_rgba(255,255,255,0.95)_42%,_rgba(241,240,247,0.95)_100%)] lg:flex-row">
      <aside className="hidden w-80 shrink-0 border-r border-slate-200/80 bg-white/65 p-6 backdrop-blur lg:block">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="EstudioAI" width={56} height={56} className="rounded-2xl" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">EstudioAI</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">Tu estudio, ordenado.</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Materias, fechas, archivos y IA en una experiencia mobile-first, clara y profesional.
          </p>
        </div>
        <nav className="mt-6 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                  active
                    ? "border-sky-200 bg-sky-50 text-sky-900 shadow-soft"
                    : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 px-4 pb-28 pt-4 sm:px-6 lg:px-10 lg:pb-10 lg:pt-10">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/92 px-2 py-3 backdrop-blur lg:hidden">
          <div
            className="mx-auto grid max-w-xl gap-1"
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                    active
                      ? "bg-sky-100 text-sky-900"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
