import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MENSAJES_CIRCULO, NOMBRE_MAX, linkCirculo, textoInvitacion, textoPin, urlWhatsApp, validarNombreCirculo, validarPin } from "@/lib/circulo";
import { linkAdministrador } from "@/lib/admin-circulo";
import { ClavesAdministrador, Dato } from "./ClavesAdministrador";

type Listo = { nombre: string; pin: string; token: string; link: string; adminLink: string; codigo: string };

function Explicacion() {
  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      <li>🎁 Cada quien pone 3 deseos, uno de cada nivel.</li>
      <li>🤫 Puedes elegir regalar el deseo de otra persona; nadie ve si sus deseos fueron elegidos.</li>
      <li>💛 Regalar es opcional, aquí no hay presión.</li>
    </ul>
  );
}

export function CrearCirculo() {
  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState<Listo | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const err = validarNombreCirculo(nombre) ?? validarPin(pin, repetir);
    if (err) { setError(MENSAJES_CIRCULO[err] ?? null); return; }
    setError(null); setCargando(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("crear_circulo", { p_nombre: nombre.trim(), p_pin: pin });
      if (rpcError) { setError(MENSAJES_CIRCULO['RED'] ?? null); return; }
      const r = data as { ok?: boolean; error?: string; codigo?: string; admin_token?: string } | null;
      if (!r?.ok || !r.codigo || !r.admin_token) {
        setError(MENSAJES_CIRCULO[r?.error ?? ""] ?? "Algo salió mal. Intenta de nuevo en un momento."); return;
      }
      setListo({ nombre: nombre.trim(), pin, token: r.admin_token, link: linkCirculo(window.location.origin, import.meta.env.BASE_URL, r.codigo), adminLink: linkAdministrador(window.location.origin, import.meta.env.BASE_URL, r.admin_token), codigo: r.codigo });
      setPin(""); setRepetir("");
    } catch { setError(MENSAJES_CIRCULO['RED'] ?? null); }
    finally { setCargando(false); }
  }

  return (
    <main className="flex min-h-screen flex-col bg-hero px-5 pb-10 pt-16 text-primary-foreground">
      <div className="mx-auto w-full min-w-0 max-w-sm">
        <p className="text-5xl">🎄</p>
        <h1 className="mt-4 break-words text-4xl font-bold leading-tight">{listo ? "¡Tu círculo está listo!" : "Crea tu círculo de regalos"}</h1>
        <p className="mt-3 break-words text-lg opacity-90 [overflow-wrap:anywhere]">
          {listo ? `"${listo.nombre}" ya existe. Guarda estos datos: solo se muestran esta vez.` : "Un espacio privado para que tu familia comparta sus deseos de Navidad."}
        </p>

        {listo ? (
          <section className="mt-10 min-w-0 space-y-5 rounded-3xl bg-card p-6 text-card-foreground shadow-soft">
            <Dato titulo="Link del círculo" valor={listo.link} ayuda="Compártelo con tu familia." />
            <Dato titulo="PIN" valor={listo.pin} ayuda="Mándalo por separado del link." />
            <ClavesAdministrador token={listo.token} link={listo.adminLink} />
            <div className="space-y-3">
              <Button asChild className="h-12 w-full rounded-xl text-base font-bold"><Link to="/" hash={`/c/${listo.codigo}`}>Entrar a mi círculo</Link></Button>
              <Button asChild className="h-12 w-full rounded-xl text-base font-bold">
                <a href={urlWhatsApp(textoInvitacion(listo.nombre, listo.link))} target="_blank" rel="noopener noreferrer">Enviar link por WhatsApp</a>
              </Button>
              <Button asChild variant="outline" className="h-12 w-full rounded-xl text-base font-bold">
                <a href={urlWhatsApp(textoPin(listo.pin))} target="_blank" rel="noopener noreferrer">Enviar el PIN aparte por WhatsApp</a>
              </Button>
            </div>
            <Explicacion />
          </section>
        ) : (
          <form onSubmit={enviar} noValidate className="mt-10 min-w-0 space-y-5 rounded-3xl bg-card p-6 text-card-foreground shadow-soft">
            <div className="space-y-2">
              <Label htmlFor="nombre-circulo">Nombre del círculo</Label>
              <Input id="nombre-circulo" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={NOMBRE_MAX} autoComplete="off" className="h-12 text-base" placeholder="Ej. Navidad en familia" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <div className="relative">
                <Input id="pin" type={ver ? "text" : "password"} value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="new-password" className="h-12 pr-12 text-base" placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setVer(!ver)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground" aria-label={ver ? "Ocultar PIN" : "Mostrar PIN"}>
                  {ver ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin2">Repite el PIN</Label>
              <Input id="pin2" type={ver ? "text" : "password"} value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" className="h-12 text-base" />
            </div>
            {error && <p role="alert" className="break-words text-sm font-semibold text-destructive">{error}</p>}
            <Button type="submit" disabled={cargando} className="h-12 w-full rounded-xl text-base font-bold">
              {cargando ? "Creando…" : "Crear círculo"}
            </Button>
            <Explicacion />
          </form>
        )}
      </div>
    </main>
  );
}
