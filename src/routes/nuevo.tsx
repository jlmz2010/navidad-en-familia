import { createFileRoute } from "@tanstack/react-router";
import { CrearCirculo } from "@/components/regalos/CrearCirculo";

export const Route = createFileRoute("/nuevo")({
  head: () => ({
    meta: [
      { title: "Crear círculo de regalos · Navidad en Familia" },
      { name: "description", content: "Crea un círculo privado para que tu familia comparta sus deseos de Navidad. Regalar es opcional." },
      { property: "og:title", content: "Crear círculo de regalos · Navidad en Familia" },
      { property: "og:description", content: "Crea un círculo privado de deseos de Navidad para tu familia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrearCirculo,
});
