import type { Metadata } from "next";
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
  title: "Proyecto Princesa",
  description: "App mobile-first para organizar materias, fechas y estudio con IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${dmSans.variable} ${sora.variable}`}>
        <AppProviders>
          <PwaRegister />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
