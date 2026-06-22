import type { Metadata } from "next";
import { headers } from "next/headers";
import { DM_Sans, Sora } from "next/font/google";

import { PwaRegister } from "@/components/pwa-register";
import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "EstudioAI",
    template: "%s · EstudioAI",
  },
  applicationName: "EstudioAI",
  description: "App mobile-first para organizar materias, fechas y estudio con IA.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await headers();

  const publicRuntimeConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "",
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  };

  return (
    <html lang="es">
      <body className={`${dmSans.variable} ${sora.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PUBLIC_RUNTIME_CONFIG__ = ${JSON.stringify(publicRuntimeConfig).replace(/</g, "\\u003c")};`,
          }}
        />
        <AppProviders>
          <PwaRegister />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
