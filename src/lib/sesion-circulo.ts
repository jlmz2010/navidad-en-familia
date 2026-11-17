export type Identidad = { nombre: string; inicial: string };
export type Sesion = { codigo: string; pin: string; persona: string; nombreCirculo: string };
export const SESION_CIRCULO_KEY = "regalos-circulo-sesion";
const IDENTIDAD_KEY = "regalos-identidad";
const CODIGO = /^[A-Za-z0-9_-]{22}$/;

/** Acepta un código o el enlace con hash, sin ejecutar ni navegar al enlace. */
export function codigoCirculo(texto: string): string | null {
  const limpio = texto.trim();
  if (CODIGO.test(limpio)) return limpio;
  const hash = limpio.startsWith("#") ? limpio : (() => {
    try { const url = new URL(limpio); return /^https?:$/.test(url.protocol) ? url.hash : ""; }
    catch { return ""; }
  })();
  const match = /^#\/c\/([^/?#]+)$/.exec(hash);
  try { const codigo = decodeURIComponent(match?.[1] ?? ""); return CODIGO.test(codigo) ? codigo : null; }
  catch { return null; }
}

export function armarPersona(nombre: string, inicial: string): string | null {
  const n = nombre.trim().replace(/\s+/g, " ");
  const i = inicial.trim().toLocaleUpperCase("es-MX");
  return n.length >= 2 && n.length <= 37 && /^\p{L}$/u.test(i) ? `${n} ${i}.` : null;
}

export function leerIdentidad(): Identidad {
  try {
    const r = JSON.parse(localStorage.getItem(IDENTIDAD_KEY) ?? "null");
    return r && typeof r.nombre === "string" && typeof r.inicial === "string" ? r : { nombre: "", inicial: "" };
  } catch { return { nombre: "", inicial: "" }; }
}
export function guardarIdentidad(identidad: Identidad) {
  localStorage.setItem(IDENTIDAD_KEY, JSON.stringify(identidad));
}
export function leerSesion(): Sesion | null {
  try {
    const r = JSON.parse(localStorage.getItem(SESION_CIRCULO_KEY) ?? "null");
    return r && typeof r.codigo === "string" && CODIGO.test(r.codigo) && typeof r.pin === "string" && r.pin.length > 0 && typeof r.persona === "string" && typeof r.nombreCirculo === "string" ? r : null;
  } catch { return null; }
}
export function guardarSesion(s: Sesion | null) {
  if (s) localStorage.setItem(SESION_CIRCULO_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESION_CIRCULO_KEY);
}
export function descartarSesionVieja(): boolean {
  const existe = localStorage.getItem("regalos-sesion") !== null;
  localStorage.removeItem("regalos-sesion");
  localStorage.removeItem("regalos-nombre");
  return existe;
}