"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CardSection } from "@/components/card-section";
import { Field, PrimaryButton, inputClassName } from "@/components/forms";
import { useAuth } from "@/hooks/use-auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setInfo("");
      const result = await register(
        String(formData.get("name") || ""),
        String(formData.get("email") || ""),
        password,
      );

      if (result.needsEmailConfirmation) {
        setInfo("Cuenta creada. Revisa tu email para confirmar el acceso en Supabase Auth.");
        router.push("/login");
        return;
      }

      router.push("/dashboard");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo crear la cuenta.",
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
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Crear cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">
          Empezá con tu perfil de estudiante y creá tu espacio personal de estudio.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Field label="Nombre" htmlFor="name">
            <input id="name" name="name" required className={inputClassName()} />
          </Field>
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
          <Field label="Confirmar contrasena" htmlFor="confirmPassword">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className={inputClassName()}
            />
          </Field>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-700">{info}</p> : null}

          <PrimaryButton type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creando cuenta..." : "Crear cuenta"}
          </PrimaryButton>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Ya tenes cuenta?{" "}
          <Link href="/login" className="font-semibold text-slate-950">
            Iniciar sesion
          </Link>
        </p>
      </CardSection>
    </main>
  );
}
