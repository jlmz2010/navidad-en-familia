import { createFileRoute } from "@tanstack/react-router";
import { AdministradorCirculo } from "@/components/regalos/AdministradorCirculo";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Administrador del círculo · Navidad en Familia" },
    { name: "description", content: "Administra las personas y el PIN de tu círculo privado de Navidad." },
    { property: "og:title", content: "Administrador del círculo · Navidad en Familia" },
    { property: "og:description", content: "Gestiona tu círculo privado de regalos sin revelar los deseos ni las sorpresas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdministradorCirculo,
});