import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Entrada } from "@/components/regalos/Entrada";
import { MiLista } from "@/components/regalos/MiLista";
import { Familia } from "@/components/regalos/Familia";
import { leerSesion, leerNombre, guardarSesion, type Sesion } from "@/lib/regalos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Regalos en Familia · Lista de Navidad" },
      { name: "description", content: "Arma tu lista de deseos de Navidad y mira la de tu familia. Regalar es opcional." },
      { property: "og:title", content: "Regalos en Familia · Lista de Navidad" },
      { property: "og:description", content: "Arma tu lista de deseos de Navidad y mira la de tu familia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [listo, setListo] = useState(false);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [nombreGuardado, setNombreGuardado] = useState<string>();
  useEffect(() => {
    const s = leerSesion(); setSesion(s); setNombreGuardado(leerNombre()); setListo(true);
  }, []);

  if (!listo) return <div className="min-h-screen bg-hero" />;
  if (!sesion) return <Entrada nombreInicial={nombreGuardado} onEntrar={(s) => { guardarSesion(s); setSesion(s); }} />;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-16">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-5">
        <div className="min-w-0 break-words">
          <p className="text-sm text-muted-foreground">¡Hola, {sesion.nombre}! 🎄</p>
          <h1 className="text-2xl font-bold">Regalos en Familia</h1>
        </div>
        <Button variant="link" className="shrink-0 text-sm font-semibold text-muted-foreground underline" onClick={() => { guardarSesion(null); setNombreGuardado(sesion.nombre); setSesion(null); }}>Salir</Button>
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
