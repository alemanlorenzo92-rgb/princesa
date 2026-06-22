import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Proyecto Princesa",
    short_name: "Princesa",
    description: "Organiza materias, examenes y material de estudio con IA.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fff7f0",
    theme_color: "#f1785a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
