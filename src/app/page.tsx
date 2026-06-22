"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, Files, Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

const highlights = [
  {
    title: "Dashboard semanal",
    description: "Proximos examenes, entregas y accesos rapidos en una sola pantalla.",
    icon: CalendarDays,
  },
  {
    title: "Materias vivas",
    description: "Cada materia con profesor, horarios, apuntes, materiales y color propio.",
    icon: BookOpen,
  },
  {
    title: "Archivos y apuntes",
    description: "Subi PDFs o pegá texto y centraliza el estudio desde el celular.",
    icon: Files,
  },
  {
    title: "IA lista para estudiar",
    description: "Genera resumenes, guias, flashcards y simulacros en segundos.",
    icon: Sparkles,
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-soft backdrop-blur sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-coral-600">
            Mobile-first PWA
          </p>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Organiza tu carrera y estudia mejor desde el celular.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Proyecto Princesa combina materias, calendario, apuntes y generacion con IA en una experiencia pensada como app nativa.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push(user ? "/dashboard" : "/register")}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              {user ? "Ir al dashboard" : "Crear mi cuenta"}
            </button>
            <Link
              href={user ? "/ai" : "/login"}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              {user ? "Abrir generador IA" : "Ya tengo cuenta"}
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-soft backdrop-blur"
              >
                <div className="inline-flex rounded-2xl bg-coral-100 p-3 text-coral-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
