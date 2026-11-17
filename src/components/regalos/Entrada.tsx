import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar, type Sesion } from "@/lib/regalos";
import { armarPersona, codigoCirculo, guardarIdentidad, type Identidad } from "@/lib/sesion-circulo";

export function Entrada({ onEntrar, identidad, aviso }: { onEntrar: (s: Sesion) => void; identidad: Identidad; aviso: string | null }) {
  const [codigo, setCodigo] = useState("");
  const [porLink, setPorLink] = useState(false);
  const [pin, setPin] = useState("");
  const [ver, setVer] = useState(false);
  const [nombre, setNombre] = useState(identidad.nombre);
  const [inicial, setInicial] = useState(identidad.inicial);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  useEffect(() => {
    const leer = () => { const c = codigoCirculo(window.location.hash); if (c) { setCodigo(c); setPorLink(true); } };
    leer(); window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const c = codigoCirculo(codigo);
    const persona = armarPersona(nombre, inicial);
    if (!c) { setError("El link o el PIN no coinciden"); return; }
    if (!persona) { setError("Escribe tu nombre (de 2 a 37 letras) y una letra para la inicial de tu apellido."); return; }
    if (!pin.trim()) { setError("Escribe el PIN de tu círculo."); return; }
    setError(null);
    setCargando(true);
    try {
      const s = await entrar(c, pin, persona);
      guardarIdentidad({ nombre: nombre.trim().replace(/\s+/g, " "), inicial: inicial.trim().toLocaleUpperCase("es-MX") });
      onEntrar(s);
    }
    catch (e) { setError((e as Error).message); }
    finally { setCargando(false); }
  }

  return (
    <main className="flex min-h-screen flex-col bg-hero px-5 pb-10 pt-16 text-primary-foreground">
      <div className="mx-auto w-full min-w-0 max-w-sm">
        <p className="text-5xl">🎄</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight">Navidad en Familia</h1>
        <p className="mt-3 text-lg opacity-90">Cuéntanos qué te haría ilusión esta Navidad. Regalar es opcional, aquí no hay presión 💛</p>
        <form onSubmit={enviar} className="mt-8 min-w-0 space-y-5 rounded-3xl bg-card p-6 text-card-foreground shadow-soft">
          <h2 className="text-xl font-bold">Entrar a mi círculo</h2>
          {aviso && <p role="alert" className="break-words text-sm text-destructive">{aviso}</p>}
          {porLink && <p className="text-sm text-muted-foreground">Entrando a tu círculo con link</p>}
          <div className="space-y-2">
            <Label htmlFor="codigo">Link o código del círculo</Label>
            <Input id="codigo" value={codigo} onChange={(e) => { setCodigo(e.target.value); setPorLink(false); }} autoCapitalize="none" autoCorrect="off" autoComplete="off" required className="h-12 min-w-0 text-base" placeholder="Pega el link o el código" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin-entrada">PIN</Label>
            <div className="relative">
              <Input id="pin-entrada" type={ver ? "text" : "password"} value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" required className="h-12 pr-12 text-base" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setVer(!ver)} className="absolute right-1 top-1 h-10 w-10" aria-label={ver ? "Ocultar PIN" : "Mostrar PIN"} title={ver ? "Ocultar PIN" : "Mostrar PIN"}>{ver ? <EyeOff /> : <Eye />}</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de pila</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="given-name" required maxLength={37} className="h-12 text-base" placeholder="Ej. Ana" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inicial">Inicial del apellido</Label>
            <Input id="inicial" value={inicial} onChange={(e) => setInicial(e.target.value.toLocaleUpperCase("es-MX"))} autoComplete="off" required maxLength={1} className="h-12 text-base" placeholder="Ej. M" />
            <p className="text-sm text-muted-foreground">Usa siempre el mismo nombre e inicial para ver tu lista.</p>
          </div>
          {error && <p role="alert" className="break-words text-sm font-semibold text-destructive">{error}</p>}
          <Button type="submit" disabled={cargando} className="h-12 w-full rounded-xl text-base font-bold">
            {cargando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <Button asChild variant="outline" className="mt-5 h-12 w-full rounded-xl bg-card text-base font-bold text-card-foreground"><Link to="/nuevo"><Plus className="h-4 w-4" />Crear círculo de regalos</Link></Button>
      </div>
    </main>
  );
}
