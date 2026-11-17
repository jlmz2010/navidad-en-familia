import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Entrada } from "@/components/regalos/Entrada";
import { MiLista } from "@/components/regalos/MiLista";
import { Familia } from "@/components/regalos/Familia";
import { escucharSesionInvalida } from "@/lib/regalos";
import { leerSesion, leerIdentidad, guardarSesion, descartarSesionVieja, type Identidad, type Sesion } from "@/lib/sesion-circulo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Navidad en Familia · Tu círculo de regalos" },
      { name: "description", content: "Entra a tu círculo privado con su link y PIN para compartir deseos de Navidad. Regalar es opcional." },
      { property: "og:title", content: "Navidad en Familia · Tu círculo de regalos" },
      { property: "og:description", content: "Comparte tus deseos de Navidad en un círculo privado, sin cuentas y sin presión." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [listo, setListo] = useState(false);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [identidad, setIdentidad] = useState<Identidad>({ nombre: "", inicial: "" });
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    const vieja = descartarSesionVieja();
    if (vieja) { guardarSesion(null); setAviso("Ahora se entra con el link del círculo y su PIN"); }
    else setSesion(leerSesion());
    setIdentidad(leerIdentidad()); setListo(true);
    return escucharSesionInvalida((mensaje) => {
      guardarSesion(null); setIdentidad(leerIdentidad()); setSesion(null); setAviso(mensaje);
    });
  }, []);

  if (!listo) return <div className="min-h-screen bg-hero" />;
  if (!sesion) return <Entrada identidad={identidad} aviso={aviso} onEntrar={(s) => { guardarSesion(s); setAviso(null); setSesion(s); }} />;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-16">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-5">
        <div className="min-w-0 break-words">
          <p className="text-sm text-muted-foreground">¡Hola, {sesion.persona}! 🎄</p>
          <h1 className="text-2xl font-bold [overflow-wrap:anywhere]">{sesion.nombreCirculo}</h1>
        </div>
        <Button variant="link" className="shrink-0 text-sm font-semibold text-muted-foreground underline" onClick={() => { guardarSesion(null); setIdentidad(leerIdentidad()); setSesion(null); setAviso(null); window.history.replaceState(null, "", window.location.pathname + window.location.search); }}>Salir</Button>
      </header>
      <Tabs defaultValue="mi">
        <TabsList className="mb-5 grid h-12 w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="mi" className="rounded-lg text-base">Mi lista</TabsTrigger>
          <TabsTrigger value="familia" className="rounded-lg text-base">Familia</TabsTrigger>
        </TabsList>
        <TabsContent value="mi"><MiLista sesion={sesion} /></TabsContent>
        <TabsContent value="familia"><Familia sesion={sesion} /></TabsContent>
      </Tabs>
    </main>
  );
}
