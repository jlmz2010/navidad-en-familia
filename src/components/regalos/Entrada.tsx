import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar, type Sesion } from "@/lib/regalos";

export function Entrada({ onEntrar, nombreInicial }: { onEntrar: (s: Sesion) => void; nombreInicial?: string }) {
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState(nombreInicial ?? "");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    try { onEntrar(await entrar(clave, nombre)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setCargando(false); }
  }

  return (
    <main className="flex min-h-screen flex-col bg-hero px-5 pb-10 pt-16 text-primary-foreground">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-5xl">🎄</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight">Regalos en Familia</h1>
        <p className="mt-3 text-lg opacity-90">Cuéntanos qué te haría ilusión esta Navidad. Regalar es opcional, aquí no hay presión 💛</p>
        <form onSubmit={enviar} className="mt-10 space-y-5 rounded-3xl bg-card p-6 text-card-foreground shadow-soft">
          <div className="space-y-2">
            <Label htmlFor="clave">Clave familiar</Label>
            <Input id="clave" value={clave} onChange={(e) => setClave(e.target.value)} autoCapitalize="characters" autoComplete="off" required className="h-12 text-base" placeholder="La que te pasó la familia" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Tu nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" required maxLength={40} className="h-12 text-base" placeholder="Ej. Lupita" />
            <p className="text-sm text-muted-foreground">Usa siempre el mismo nombre para ver tu lista.</p>
          </div>
          <Button type="submit" disabled={cargando} className="h-12 w-full rounded-xl text-base font-bold">
            {cargando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
