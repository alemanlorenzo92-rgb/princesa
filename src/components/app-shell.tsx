"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  FolderClosed,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/subjects", label: "Materias", icon: BookOpen },
  { href: "/calendar", label: "Fechas", icon: CalendarDays },
  { href: "/files", label: "Archivos", icon: FolderClosed },
  { href: "/ai", label: "IA", icon: Sparkles },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/settings", label: "Mas", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
      <aside className="hidden w-72 shrink-0 border-r border-white/50 bg-white/55 p-6 backdrop-blur lg:block">
        <div className="rounded-3xl bg-gradient-to-br from-coral-400 to-amber-300 p-5 text-slate-950 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">Proyecto Princesa</p>
          <h1 className="mt-3 text-3xl font-semibold">Tu campus personal</h1>
          <p className="mt-3 text-sm text-slate-900/75">
            Organiza materias, fechas y material de estudio desde el celular.
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
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-slate-900 text-white shadow-soft"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
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
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/88 px-2 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-xl grid-cols-7 gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                    active ? "bg-slate-900 text-white" : "text-slate-500",
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
