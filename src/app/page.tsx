"use client";

import Link from "next/link";
import Image from "next/image";
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
    title: "Estudio unificado",
    description: "Archivos, IA y chat conviven en una sola experiencia pensada para el celular.",
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
        <div className="rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-soft backdrop-blur sm:p-10">
          <div className="flex items-center gap-4">
            <Image src="/logo.svg" alt="EstudioAI" width={64} height={64} className="rounded-2xl shadow-sm" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-coral-600">
                EstudioAI
              </p>
              <p className="mt-1 text-sm text-slate-500">Mobile-first PWA para estudiar mejor.</p>
            </div>
          </div>
          <h1 className="mt-6 max-w-xl font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Organiza tu carrera y estudia mejor desde el celular.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            EstudioAI combina materias, calendario, apuntes y generacion con IA en una experiencia
            pensada como app nativa.
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
              href={user ? "/study" : "/login"}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              {user ? "Abrir Estudio" : "Ya tengo cuenta"}
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[28px] border border-white/60 bg-white/78 p-5 shadow-soft backdrop-blur"
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
