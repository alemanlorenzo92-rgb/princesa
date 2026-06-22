import Link from "next/link";
import { ArrowRight, FileText, MessageSquareText, Sparkles, Upload } from "lucide-react";

import { CardSection } from "@/components/card-section";
import { PageHeader } from "@/components/page-header";

const studyActions = [
  {
    href: "/files",
    title: "Archivos y apuntes",
    description: "Subi PDFs, pegá texto y centralizá tu material de estudio.",
    icon: Upload,
    accent: "from-sky-400 to-cyan-300",
  },
  {
    href: "/ai",
    title: "Generar con IA",
    description: "Creá resúmenes, guías, flashcards y simulacros con un solo flujo.",
    icon: Sparkles,
    accent: "from-violet-400 to-fuchsia-300",
  },
  {
    href: "/chat",
    title: "Chat de estudio",
    description: "Hacé preguntas sobre materias, PDFs y materiales guardados.",
    icon: MessageSquareText,
    accent: "from-emerald-400 to-teal-300",
  },
  {
    href: "/materials",
    title: "Materiales recientes",
    description: "Revisá todo lo generado y retomá tu estudio al instante.",
    icon: FileText,
    accent: "from-amber-400 to-orange-300",
  },
];

export default function StudyPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Estudio"
        title="Todo tu estudio en una sola pantalla"
        description="Acá tenés el acceso unificado a archivos, IA, chat y materiales, con una experiencia mobile-first y más simple."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {studyActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className={`inline-flex rounded-2xl bg-gradient-to-br ${action.accent} p-3 text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{action.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                Abrir
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Flujo recomendado</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>1. Elegí una materia.</p>
            <p>2. Subí o abrí un PDF o apunte.</p>
            <p>3. Generá un resumen, guía o flashcards.</p>
            <p>4. Abrí el chat para hacer preguntas sobre ese contenido.</p>
          </div>
        </CardSection>

        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Atajos</h2>
          <div className="mt-4 grid gap-3">
            <Link href="/subjects" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              Ver materias
            </Link>
            <Link href="/calendar" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              Ver fechas
            </Link>
            <Link href="/settings" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              Ajustes
            </Link>
          </div>
        </CardSection>
      </div>
    </div>
  );
}
