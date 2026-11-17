import { supabase } from "@/integrations/supabase/client";

export type Nivel = "sin_costo" | "muy_barato" | "normal";
export const NIVELES: { id: Nivel; label: string; emoji: string; ayuda: string; clase: string }[] = [
  { id: "sin_costo", label: "Sin costo", emoji: "💌", ayuda: "Un abrazo, una carta, un favor, algo hecho a mano", clase: "bg-nivel-gratis" },
  { id: "muy_barato", label: "Muy barato", emoji: "🍬", ayuda: "Un detallito sencillo", clase: "bg-nivel-barato" },
  { id: "normal", label: "Normal", emoji: "🎁", ayuda: "Un regalo de los de siempre", clase: "bg-nivel-normal" },
];
export const nivelInfo = (n: string) => NIVELES.find((x) => x.id === n) ?? NIVELES.find((x) => x.id === "normal") ?? NIVELES[0];

export type Deseo = { id: string; titulo: string; nivel: Nivel; link: string | null; nota: string | null };
export type DeseoFamilia = Deseo & { persona: string; estado: "libre" | "mio" | "elegido" };
export type Sesion = { clave: string; nombre: string };

const KEY = "regalos-sesion";
const NOMBRE_KEY = "regalos-nombre";
export const leerNombre = () => localStorage.getItem(NOMBRE_KEY) ?? leerSesion()?.nombre;
export const leerSesion = (): Sesion | null => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
};
export const guardarSesion = (s: Sesion | null) => {
  const nombre = s?.nombre ?? leerSesion()?.nombre;
  if (nombre) localStorage.setItem(NOMBRE_KEY, nombre);
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
};

export function linkSeguro(link: string | null): link is string {
  if (!link || !/^https?:\/\/[^\s/\\?#]+([/?#][^\s\\]*)?$/i.test(link)) return false;
  try {
    const url = new URL(link);
    return (url.protocol === "http:" || url.protocol === "https:") && !!url.hostname;
  } catch { return false; }
}

const MENSAJES: Record<string, string> = {
  CLAVE_INVALIDA: "Esa clave no coincide. Pídesela a alguien de la familia 😊",
  NOMBRE_INVALIDO: "Escribe tu nombre (de 2 a 40 letras).",
  MAXIMO_4: "Ya tienes 4 deseos, ¡es el máximo!",
  FALTA_NIVEL: "Tus primeros 3 deseos van uno de cada nivel. Elige el nivel que te falta.",
  LINK_INVALIDO: "El link debe comenzar con http:// o https:// y tener una dirección válida.",
  NO_ENCONTRADO: "No encontramos ese deseo.",
};
function err(e: { message: string } | null) {
  if (!e) return;
  const k = Object.keys(MENSAJES).find((m) => e.message.includes(m));
  throw new Error(k ? MENSAJES[k] : "Algo falló. Intenta de nuevo en un ratito.");
}
const p = (s: Sesion) => ({ p_clave: s.clave, p_persona: s.nombre });

export async function entrar(clave: string, nombre: string): Promise<Sesion> {
  const { data, error } = await supabase.rpc("entrar", { p_clave: clave, p_persona: nombre });
  err(error);
  return { clave: clave.trim(), nombre: data as string };
}
export async function miLista(s: Sesion): Promise<Deseo[]> {
  const { data, error } = await supabase.rpc("mi_lista", p(s)); err(error);
  return (data ?? []) as Deseo[];
}
export async function guardarDeseo(s: Sesion, d: Omit<Deseo, "id"> & { id?: string }) {
  const { error } = await supabase.rpc("guardar_deseo", {
    ...p(s), p_id: (d.id ?? null) as unknown as string, p_titulo: d.titulo, p_nivel: d.nivel,
    p_link: d.link ?? "", p_nota: d.nota ?? "",
  });
  err(error);
}
export async function borrarDeseo(s: Sesion, id: string) {
  const { error } = await supabase.rpc("borrar_deseo", { ...p(s), p_id: id }); err(error);
}
export async function familia(s: Sesion): Promise<DeseoFamilia[]> {
  const { data, error } = await supabase.rpc("familia", p(s)); err(error);
  return (data ?? []) as DeseoFamilia[];
}
export async function apartar(s: Sesion, id: string) {
  const { data, error } = await supabase.rpc("apartar", { ...p(s), p_id: id }); err(error);
  if (!data) throw new Error("¡Uy! Alguien más lo eligió primero.");
}
export async function soltar(s: Sesion, id: string) {
  const { error } = await supabase.rpc("soltar", { ...p(s), p_id: id }); err(error);
}

/** Niveles que aún puede usar el siguiente deseo según la regla 3 obligatorios + 1 libre. */
export function nivelesPermitidos(lista: { nivel: Nivel }[]): Nivel[] {
  const usados = new Set(lista.map((d) => d.nivel));
  const faltan = NIVELES.map((n) => n.id).filter((n) => !usados.has(n));
  if (lista.length >= 4) return [];
  return lista.length < 3 || faltan.length > 0 ? faltan : NIVELES.map((n) => n.id);
}
