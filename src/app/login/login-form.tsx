"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CardSection } from "@/components/card-section";
import { Field, PrimaryButton, inputClassName } from "@/components/forms";
import { useAuth } from "@/hooks/use-auth";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      setSubmitting(true);
      setError("");
      await login(
        String(formData.get("email") || ""),
        String(formData.get("password") || ""),
      );
      router.push(`/welcome?next=${encodeURIComponent(nextPath || "/dashboard")}`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo iniciar sesion.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <CardSection className="w-full p-7 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-coral-600">
          EstudioAI
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Iniciar sesion</h1>
        <p className="mt-2 text-sm text-slate-600">
          Accede a tu estudio, materias, archivos y herramientas de IA desde una sola cuenta.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" required className={inputClassName()} />
          </Field>
          <Field label="Contrasena" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className={inputClassName()}
            />
          </Field>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <PrimaryButton type="submit" disabled={submitting} className="w-full">
            {submitting ? "Ingresando..." : "Entrar"}
          </PrimaryButton>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Todavia no tenes cuenta?{" "}
          <Link href="/register" className="font-semibold text-slate-950">
            Crear cuenta
          </Link>
        </p>
      </CardSection>
    </main>
  );
}
