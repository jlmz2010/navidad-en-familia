import { supabase } from "@/integrations/supabase/client";
import { MENSAJES_CIRCULO } from "./circulo";

export function validarToken(token: string): boolean { return /^[a-fA-F0-9]{64}$/.test(token); }
export function extraerToken(texto: string): string | null {
  const limpio = texto.trim();
  if (validarToken(limpio)) return limpio;
  let hash = limpio;
  if (!limpio.startsWith("#")) {
    try { const url = new URL(limpio); if (!/^https?:$/.test(url.protocol)) return null; hash = url.hash; }
    catch { return null; }
  }
  const token = /^#\/admin\/([a-fA-F0-9]{64})$/.exec(hash)?.[1];
  return token && validarToken(token) ? token : null;
}
export function linkAdministrador(origin: string, base: string | undefined, token: string): string {
  let b = base || "/";
  if (!b.startsWith("/")) b = "/" + b;
  if (!b.endsWith("/")) b += "/";
  return `${origin.replace(/\/+$/, "")}${b}#/admin/${token}`;
}
// One navigation handoff only. No browser storage, search parameters, or SSR reads.
let pendiente: string | null = null;
export function entregarToken(token: string) { pendiente = token; }
export function tomarToken(): string | null { const t = pendiente; pendiente = null; return t; }

export const AVISO_ADMIN = "Guarda estos datos en un lugar seguro: no se pueden recuperar y solo se muestran esta vez.";
const MENSAJES: Record<string, string> = {
  ...MENSAJES_CIRCULO,
  ADMIN_INVALIDO: "La clave de administrador no es correcta",
  CIRCULO_O_PIN_INCORRECTO: "El link o el PIN no coinciden",
  ADMIN_YA_RECLAMADO: "Este círculo ya tiene administrador",
  PERSONA_NO_EXISTE: "Esa persona ya no tiene deseos en este círculo.",
  CIRCULO_PROTEGIDO: "El círculo original de la familia no se puede borrar en este ciclo.",
  CONFIRMACION_INCORRECTA: "Escribe el nombre del círculo exactamente como aparece.",
};
export function mensajeAdmin(error: string, minutos?: number): string {
  return error === "BLOQUEADO" ? `Por seguridad, espera ${minutos ?? 15} minutos antes de intentar de nuevo.` : MENSAJES[error] ?? "No pudimos completar el cambio. Intenta de nuevo en un momento.";
}
export type InfoAdmin = { nombre: string; codigo: string; personas: { persona: string; num_deseos: number }[] };
type Respuesta = Partial<InfoAdmin> & { ok: boolean; error?: string; minutos?: number; admin_token?: string };
type Operacion = "admin_info_c" | "admin_quitar_persona_c" | "admin_cambiar_pin_c" | "admin_borrar_circulo_c" | "reclamar_admin_c";
export async function llamarAdmin(operacion: Operacion, args: { p_token: string } | { p_token: string; p_persona: string } | { p_token: string; p_pin_nuevo: string } | { p_token: string; p_confirmacion: string } | { p_codigo: string; p_pin: string }): Promise<Respuesta> {
  // POST bodies only. Never propagate SDK errors that might contain credentials.
  try {
    const { data, error } = await supabase.rpc(operacion, args);
    if (error) throw new Error("RED");
    const r = data as Respuesta | null;
    if (!r?.ok) return { ok: false, error: r?.error ?? "RED", ...(r?.minutos ? { minutos: r.minutos } : {}) };
    return r;
  } catch { return { ok: false, error: "RED" }; }
}