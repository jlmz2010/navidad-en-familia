import { supabase } from "@/integrations/supabase/client";
import type { Sesion } from "./sesion-circulo";
export { leerSesion, guardarSesion, type Sesion } from "./sesion-circulo";

export type Nivel = "sin_costo" | "muy_barato" | "normal";
export const NIVELES: { id: Nivel; label: string; emoji: string; ayuda: string; clase: string }[] = [
  { id: "sin_costo", label: "Sin costo", emoji: "💌", ayuda: "Un abrazo, una carta, un favor, algo hecho a mano", clase: "bg-nivel-gratis" },
  { id: "muy_barato", label: "Muy barato", emoji: "🍬", ayuda: "Un detallito sencillo", clase: "bg-nivel-barato" },
  { id: "normal", label: "Normal", emoji: "🎁", ayuda: "Un regalo de los de siempre", clase: "bg-nivel-normal" },
];
export const nivelInfo = (n: string) => NIVELES.find((x) => x.id === n) ?? NIVELES.find((x) => x.id === "normal") ?? NIVELES[0];

export type Deseo = { id: string; titulo: string; nivel: Nivel; link: string | null; nota: string | null };
export type DeseoFamilia = Deseo & { persona: string; estado: "libre" | "mio" | "elegido" };

export function linkSeguro(link: string | null): link is string {
  if (!link || !/^https?:\/\/[^\s/\\?#]+([/?#][^\s\\]*)?$/i.test(link)) return false;
  try {
    const url = new URL(link);
    return (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname;
  } catch { return false; }
}

const MENSAJES: Record<string, string> = {
  CIRCULO_O_PIN_INCORRECTO: "El link o el PIN no coinciden",
  CIRCULO_LLENO: "Este círculo ya está lleno",
  NOMBRE_INVALIDO: "Escribe tu nombre (de 2 a 40 letras).",
  MAXIMO_4: "Ya tienes 4 deseos, ¡es el máximo!",
  FALTA_NIVEL: "Tus primeros 3 deseos van uno de cada nivel. Elige el nivel que te falta.",
  LINK_INVALIDO: "El link debe comenzar con http:// o https:// y tener una dirección válida.",
  NO_ENCONTRADO: "No encontramos ese deseo.",
  NO_DISPONIBLE: "¡Uy! Alguien más lo eligió primero o ya no está disponible.",
  TITULO_INVALIDO: "Escribe un deseo de hasta 120 letras.",
  NOTA_INVALIDA: "La nota puede tener hasta 300 letras.",
};
type Respuesta = { ok: boolean; error?: string; minutos?: number; nombre?: string; deseos?: Deseo[] | DeseoFamilia[] };
const oyentes = new Set<(mensaje: string) => void>();
export function escucharSesionInvalida(oyente: (mensaje: string) => void) {
  oyentes.add(oyente); return () => { oyentes.delete(oyente); };
}
function respuesta(data: unknown, error: unknown, guardada = true): Respuesta {
  if (error || !data || typeof data !== "object") throw new Error("No pudimos conectarnos. Revisa tu internet e intenta de nuevo.");
  const r = data as Respuesta;
  if (!r.ok) {
    const mensaje = r.error === "BLOQUEADO" ? `Demasiados intentos. Intenta de nuevo en ${Math.max(1, Math.ceil(r.minutos ?? 15))} minutos`
      : MENSAJES[r.error ?? ""] ?? "Algo falló. Intenta de nuevo en un ratito.";
    if (guardada && (r.error === "CIRCULO_O_PIN_INCORRECTO" || r.error === "BLOQUEADO")) oyentes.forEach((f) => f(mensaje));
    throw new Error(mensaje);
  }
  return r;
}
const p = (s: Sesion) => ({ p_codigo: s.codigo, p_pin: s.pin, p_persona: s.persona });
export async function entrar(codigo: string, pin: string, persona: string): Promise<Sesion> {
  const login = await supabase.rpc("entrar_circulo", { p_codigo: codigo, p_pin: pin });
  const r = respuesta(login.data, login.error, false);
  // entrar_circulo no recibe persona: esta lectura verifica el tope de miembros.
  const lista = await supabase.rpc("mi_lista_c", { p_codigo: codigo, p_pin: pin, p_persona: persona });
  respuesta(lista.data, lista.error, false);
  return { codigo, pin, persona, nombreCirculo: r.nombre ?? "Navidad en Familia" };
}
export async function miLista(s: Sesion): Promise<Deseo[]> {
  const { data, error } = await supabase.rpc("mi_lista_c", p(s));
  return (respuesta(data, error).deseos ?? []) as Deseo[];
}
export async function guardarDeseo(s: Sesion, d: Omit<Deseo, "id"> & { id?: string }) {
  const { data, error } = await supabase.rpc("guardar_deseo_c", {
    ...p(s), p_id: (d.id ?? null) as unknown as string, p_titulo: d.titulo, p_nivel: d.nivel,
    p_link: d.link ?? "", p_nota: d.nota ?? "",
  });
  respuesta(data, error);
}
export async function borrarDeseo(s: Sesion, id: string) {
  const { data, error } = await supabase.rpc("borrar_deseo_c", { ...p(s), p_id: id }); respuesta(data, error);
}
export async function familia(s: Sesion): Promise<DeseoFamilia[]> {
  const { data, error } = await supabase.rpc("familia_c", p(s));
  return (respuesta(data, error).deseos ?? []) as DeseoFamilia[];
}
export async function apartar(s: Sesion, id: string) {
  const { data, error } = await supabase.rpc("apartar_c", { ...p(s), p_id: id }); respuesta(data, error);
}
export async function soltar(s: Sesion, id: string) {
  const { data, error } = await supabase.rpc("soltar_c", { ...p(s), p_id: id }); respuesta(data, error);
}

/** Niveles que aún puede usar el siguiente deseo según la regla 3 obligatorios + 1 libre. */
export function nivelesPermitidos(lista: { nivel: Nivel }[]): Nivel[] {
  const usados = new Set(lista.map((d) => d.nivel));
  const faltan = NIVELES.map((n) => n.id).filter((n) => !usados.has(n));
  if (lista.length >= 4) return [];
  return lista.length < 3 || faltan.length > 0 ? faltan : NIVELES.map((n) => n.id);
}
