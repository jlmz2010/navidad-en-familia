import { beforeEach, describe, expect, it } from "vitest";
import { armarPersona, codigoCirculo, descartarSesionVieja, guardarIdentidad, guardarSesion, leerIdentidad, leerSesion, SESION_CIRCULO_KEY } from "./sesion-circulo";

const codigo = "a".repeat(22);
beforeEach(() => localStorage.clear());
describe("código del círculo", () => {
  it("acepta exactamente 22 caracteres válidos", () => {
    expect(codigoCirculo(` ${codigo} `)).toBe(codigo);
    expect(codigoCirculo("a".repeat(21))).toBeNull();
    expect(codigoCirculo("a".repeat(23))).toBeNull();
    expect(codigoCirculo("!".repeat(22))).toBeNull();
  });
  it("extrae el hash de Lovable y de GitHub Pages", () => {
    expect(codigoCirculo(`#/c/${codigo}`)).toBe(codigo);
    expect(codigoCirculo(`https://example.com/#/c/${codigo}`)).toBe(codigo);
    expect(codigoCirculo(`https://example.com/navidad-en-familia/#/c/${codigo}`)).toBe(codigo);
    expect(codigoCirculo(`javascript:alert(1)#/c/${codigo}`)).toBeNull();
    expect(codigoCirculo("#/c/%ZZ")).toBeNull();
  });
});
it("arma Nombre I. con inicial obligatoria de una letra", () => {
  expect(armarPersona(" Ana ", "m")).toBe("Ana M.");
  expect(armarPersona("Beto", "r")).toBe("Beto R.");
  expect(armarPersona("Cata", "s")).toBe("Cata S.");
  expect(armarPersona("Ana", "")).toBeNull();
  expect(armarPersona("Ana", "MM")).toBeNull();
  expect(armarPersona("Ana", "1")).toBeNull();
});
it("recargar conserva sesión; salir elimina PIN y código, no identidad", () => {
  const s = { codigo, pin: "pin-ficticio", persona: "Ana M.", nombreCirculo: "Prueba" };
  guardarIdentidad({ nombre: "Ana", inicial: "M" }); guardarSesion(s);
  expect(leerSesion()).toEqual(s);
  guardarSesion(null);
  expect(leerSesion()).toBeNull();
  expect(localStorage.getItem(SESION_CIRCULO_KEY)).toBeNull();
  expect(leerIdentidad()).toEqual({ nombre: "Ana", inicial: "M" });
});
it("descarta una sesión vieja una sola vez", () => {
  localStorage.setItem("regalos-sesion", JSON.stringify({ nombre: "Ana" }));
  expect(descartarSesionVieja()).toBe(true);
  expect(descartarSesionVieja()).toBe(false);
  expect(leerSesion()).toBeNull();
});
it("rechaza sesiones incompletas o corruptas", () => {
  localStorage.setItem(SESION_CIRCULO_KEY, "{"); expect(leerSesion()).toBeNull();
  localStorage.setItem(SESION_CIRCULO_KEY, JSON.stringify({ codigo })); expect(leerSesion()).toBeNull();
});