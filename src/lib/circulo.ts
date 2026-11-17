// Helpers puros para crear círculos (sin acceso a navegador ni red).
export const NOMBRE_MAX = 60;
export const PIN_MIN = 6;
export const PIN_MAX_BYTES = 72;

export type ErrorCirculo = "NOMBRE_INVALIDO" | "PIN_CORTO" | "PIN_LARGO" | "PIN_NO_COINCIDE";

export function validarNombreCirculo(nombre: string): ErrorCirculo | null {
  const n = nombre.trim().length;
  return n >= 1 && n <= NOMBRE_MAX ? null : "NOMBRE_INVALIDO";
}

export function validarPin(pin: string, repetir?: string): ErrorCirculo | null {
  const limpio = pin.trim();
  if (limpio.length < PIN_MIN) return "PIN_CORTO";
  if (new TextEncoder().encode(limpio.toLowerCase()).length > PIN_MAX_BYTES) return "PIN_LARGO";
  if (repetir !== undefined && repetir !== pin) return "PIN_NO_COINCIDE";
  return null;
}

export const MENSAJES_CIRCULO: Record<string, string> = {
  NOMBRE_INVALIDO: "Ponle un nombre a tu círculo (de 1 a 60 letras).",
  PIN_CORTO: "El PIN necesita al menos 6 caracteres.",
  PIN_LARGO: "Ese PIN es demasiado largo; usa uno más corto.",
  PIN_INVALIDO: "El PIN necesita al menos 6 caracteres y no puede ser tan largo.",
  PIN_NO_COINCIDE: "Los dos PIN no coinciden. Revísalos con calma.",
  LIMITE_CREACION: "Hoy se crearon muchos círculos, intenta en un rato.",
  RED: "No pudimos conectarnos. Revisa tu internet e intenta de nuevo.",
};

export function linkCirculo(origin: string, base: string | undefined, codigo: string): string {
  let b = base && base.length ? base : "/";
  if (!b.startsWith("/")) b = "/" + b;
  if (!b.endsWith("/")) b += "/";
  return `${origin.replace(/\/+$/, "")}${b}#/c/${encodeURIComponent(codigo)}`;
}

export const textoInvitacion = (nombre: string, link: string) =>
  `Te invito a mi círculo de regalos de Navidad "${nombre.trim()}". Entra aquí: ${link}`;
export const textoPin = (pin: string) => `El PIN de nuestro círculo es: ${pin}`;
export const urlWhatsApp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`;
