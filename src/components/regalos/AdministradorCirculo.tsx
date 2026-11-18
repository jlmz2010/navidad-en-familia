import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogHeader, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { extraerToken, tomarToken, llamarAdmin, mensajeAdmin, linkAdministrador, type InfoAdmin } from "@/lib/admin-circulo";
import { codigoCirculo } from "@/lib/sesion-circulo";
import { validarPin, textoPin, urlWhatsApp } from "@/lib/circulo";
import { ClavesAdministrador } from "./ClavesAdministrador";

function CamposPin({ pin, repetir, setPin, setRepetir, prefijo }: { pin: string; repetir: string; setPin: (v: string) => void; setRepetir: (v: string) => void; prefijo: string }) {
  const [ver, setVer] = useState(false);
  return <>
    <div className="space-y-2"><Label htmlFor={`${prefijo}-pin`}>PIN nuevo</Label>
      <div className="relative"><Input id={`${prefijo}-pin`} value={pin} onChange={e => setPin(e.target.value)} type={ver ? "text" : "password"} autoComplete="new-password" className="h-12 pr-12 text-base" placeholder="Mínimo 6 caracteres" />
        <Button type="button" variant="ghost" size="icon" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar PIN" : "Mostrar PIN"} title={ver ? "Ocultar PIN" : "Mostrar PIN"} className="absolute right-1 top-1 h-10 w-10">{ver ? <EyeOff /> : <Eye />}</Button>
      </div>
    </div>
    <div className="space-y-2"><Label htmlFor={`${prefijo}-repetir`}>Repite el PIN</Label><Input id={`${prefijo}-repetir`} value={repetir} onChange={e => setRepetir(e.target.value)} type={ver ? "text" : "password"} autoComplete="new-password" className="h-12 text-base" /></div>
  </>;
}

export function AdministradorCirculo() {
  const [entrada, setEntrada] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [persona, setPersona] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [repetir, setRepetir] = useState("");
  const [pinListo, setPinListo] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pinReclamar, setPinReclamar] = useState("");
  const [verReclamar, setVerReclamar] = useState(false);
  const [claves, setClaves] = useState<{ token: string; link: string; nombre: string } | null>(null);

  async function acceder(t: string) {
    setOcupado(true); setError(null); setAviso(null);
    const r = await llamarAdmin("admin_info_c", { p_token: t });
    setOcupado(false);
    if (!r.ok || !r.nombre || !r.codigo || !r.personas) { setError(mensajeAdmin(r.error ?? "RED", r.minutos)); return; }
    setToken(t); setEntrada(""); setInfo({ nombre: r.nombre, codigo: r.codigo, personas: r.personas });
  }
  useEffect(() => {
    const t = tomarToken() ?? extraerToken(window.location.hash);
    if (t) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      void acceder(t);
    }
  }, []);

  function salir() {
    setToken(null); setInfo(null); setEntrada(""); setClaves(null); setPin(""); setRepetir(""); setPinListo(null); setConfirmacion(""); setError(null); setAviso(null);
  }
  async function quitar() {
    if (!token || !persona) return;
    setOcupado(true); setError(null);
    const r = await llamarAdmin("admin_quitar_persona_c", { p_token: token, p_persona: persona });
    setPersona(null); setOcupado(false);
    if (!r.ok) { setError(mensajeAdmin(r.error ?? "RED")); return; }
    await acceder(token); setAviso("Se borraron sus deseos y sus regalos elegidos quedaron libres.");
  }
  async function cambiar(e: React.FormEvent) {
    e.preventDefault(); if (!token) return;
    const err = validarPin(pin, repetir);
    if (err) { setError(mensajeAdmin(err)); return; }
    setOcupado(true); setError(null);
    const r = await llamarAdmin("admin_cambiar_pin_c", { p_token: token, p_pin_nuevo: pin });
    setOcupado(false);
    if (!r.ok) { setError(mensajeAdmin(r.error ?? "RED")); return; }
    setPinListo(pin); setPin(""); setRepetir(""); setAviso("El PIN cambió. Quien tenga una sesión abierta tendrá que entrar de nuevo.");
  }
  async function borrar() {
    if (!token || !info || confirmacion !== info.nombre) return;
    setOcupado(true); setError(null);
    const r = await llamarAdmin("admin_borrar_circulo_c", { p_token: token, p_confirmacion: confirmacion });
    setOcupado(false);
    if (!r.ok) { setError(mensajeAdmin(r.error ?? "RED")); return; }
    salir(); setAviso("El círculo y todos sus deseos se borraron.");
  }
  async function reclamar(e: React.FormEvent) {
    e.preventDefault(); const c = codigoCirculo(codigo);
    if (!c) { setError(mensajeAdmin("CIRCULO_O_PIN_INCORRECTO")); return; }
    setOcupado(true); setError(null);
    const r = await llamarAdmin("reclamar_admin_c", { p_codigo: c, p_pin: pinReclamar });
    setOcupado(false); setPinReclamar("");
    if (!r.ok || !r.admin_token || !r.nombre) { setError(mensajeAdmin(r.error ?? "RED", r.minutos)); return; }
    setCodigo(""); setEntrada("");
    setClaves({ token: r.admin_token, nombre: r.nombre, link: linkAdministrador(window.location.origin, import.meta.env.BASE_URL, r.admin_token) });
  }
  const alerta = <>{error && <p role="alert" className="break-words text-sm font-semibold text-destructive">{error}</p>}{aviso && <p role="status" className="break-words rounded-lg bg-muted p-3 text-sm">{aviso}</p>}</>;

  return <main className="mx-auto min-h-screen w-full min-w-0 max-w-xl px-5 pb-12 pt-8 [overflow-wrap:anywhere]">
    <header className="mb-8 space-y-3"><Button asChild variant="link" className="px-0 text-muted-foreground"><Link to="/">← Volver a Navidad en Familia</Link></Button><p className="text-4xl">🎄</p><h1 className="text-3xl font-bold">Administrador del círculo</h1></header>
    <div className="space-y-6">{alerta}
      {claves ? <section className="min-w-0 space-y-5">
        <h2 className="text-2xl font-bold">¡Ya administras {claves.nombre}!</h2>
        <ClavesAdministrador token={claves.token} link={claves.link} />
        <Button disabled={ocupado} onClick={async () => { const t = claves.token; setClaves(null); await acceder(t); }} className="h-12 w-full">Ir al panel</Button>
      </section> : info && token ? <>
        <section className="space-y-4"><div className="flex min-w-0 items-start justify-between gap-3"><h2 className="min-w-0 text-2xl font-bold">{info.nombre}</h2><Button variant="ghost" size="icon" disabled={ocupado} onClick={salir} aria-label="Salir de administración" title="Salir de administración"><LogOut /></Button></div>
          <h3 className="font-semibold">Personas del círculo</h3>
          <ul className="divide-y divide-border">{info.personas.map(p => <li key={p.persona} className="flex min-w-0 items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="font-semibold">{p.persona}</p><p className="text-sm text-muted-foreground">{p.num_deseos} {p.num_deseos === 1 ? "deseo" : "deseos"}</p></div><Button variant="outline" size="icon" disabled={ocupado} onClick={() => setPersona(p.persona)} aria-label={`Quitar ${p.persona}`} title={`Quitar ${p.persona}`}><Trash2 className="h-4 w-4" /></Button></li>)}</ul>
          {!info.personas.length && <p className="text-sm text-muted-foreground">Todavía no hay personas con deseos.</p>}
          <p className="text-sm text-muted-foreground">Una persona puede volver a entrar mientras tenga el PIN. Para sacar a alguien de verdad, cambia el PIN y compártelo solo con quienes seguirán en el círculo.</p>
        </section>
        <form onSubmit={cambiar} noValidate className="space-y-4 border-t border-border pt-6"><h3 className="text-xl font-bold">Cambiar PIN</h3><CamposPin pin={pin} repetir={repetir} setPin={setPin} setRepetir={setRepetir} prefijo="cambiar" /><Button type="submit" disabled={ocupado} className="h-12 w-full">{ocupado ? "Espera…" : "Cambiar PIN"}</Button>
          <p className="text-sm text-muted-foreground">Quien tenga sesión abierta tendrá que entrar de nuevo.</p>
          {pinListo && <Button asChild variant="outline" className="h-auto min-h-12 w-full whitespace-normal"><a href={urlWhatsApp(textoPin(pinListo))} target="_blank" rel="noopener noreferrer">Enviar el PIN nuevo por WhatsApp</a></Button>}
        </form>
        <section className="space-y-4 border-t border-destructive/40 pt-6"><h3 className="text-xl font-bold text-destructive">Zona de peligro</h3><p className="text-sm">Borrar el círculo elimina todos sus deseos. No se puede deshacer.</p><Label htmlFor="confirmacion">Escribe exactamente: {info.nombre}</Label><Input id="confirmacion" value={confirmacion} onChange={e => setConfirmacion(e.target.value)} autoComplete="off" className="h-12 text-base" /><Button variant="destructive" disabled={ocupado || confirmacion !== info.nombre} onClick={borrar} className="h-12 w-full"><Trash2 className="h-4 w-4" />Borrar círculo</Button></section>
      </> : <>
        <form onSubmit={e => { e.preventDefault(); const t = extraerToken(entrada); if (!t) { setError(mensajeAdmin("ADMIN_INVALIDO")); return; } void acceder(t); }} noValidate className="space-y-4"><Label htmlFor="admin-clave">Clave de administrador</Label><Input id="admin-clave" value={entrada} onChange={e => setEntrada(e.target.value)} type="password" autoComplete="off" autoCapitalize="none" autoCorrect="off" placeholder="Pega la clave o el link de administrador" className="h-12 text-base" /><Button type="submit" disabled={ocupado} className="h-12 w-full">{ocupado ? "Validando…" : "Entrar como administrador"}</Button></form>
        <form onSubmit={reclamar} noValidate className="space-y-4 rounded-lg border border-border p-5"><h2 className="text-xl font-bold">Reclamar administración</h2><p className="text-sm text-muted-foreground">Solo para círculos que todavía no tienen administrador.</p><Label htmlFor="reclamar-codigo">Link o código del círculo</Label><Input id="reclamar-codigo" value={codigo} onChange={e => setCodigo(e.target.value)} autoComplete="off" className="h-12 text-base" /><Label htmlFor="reclamar-pin">PIN</Label><div className="relative"><Input id="reclamar-pin" value={pinReclamar} onChange={e => setPinReclamar(e.target.value)} type={verReclamar ? "text" : "password"} autoComplete="off" className="h-12 pr-12 text-base" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-10 w-10" aria-label={verReclamar ? "Ocultar PIN del círculo" : "Mostrar PIN del círculo"} title="Mostrar u ocultar PIN" onClick={() => setVerReclamar(!verReclamar)}>{verReclamar ? <EyeOff /> : <Eye />}</Button></div><Button type="submit" variant="outline" disabled={ocupado} className="h-12 w-full">Reclamar administración</Button></form>
      </>}
    </div>
    <AlertDialog open={persona !== null} onOpenChange={open => { if (!open && !ocupado) setPersona(null); }}><AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg"><AlertDialogHeader><AlertDialogTitle>¿Quitar a {persona}?</AlertDialogTitle><AlertDialogDescription>Se borrarán sus deseos y los regalos que había elegido quedarán libres. Puede volver a entrar mientras tenga el PIN.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={ocupado} onClick={e => { e.preventDefault(); void quitar(); }}>Quitar persona</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>;
}