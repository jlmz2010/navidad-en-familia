import { describe, it, expect } from "vitest";
import { nivelesPermitidos, linkSeguro, guardarSesion, leerNombre, leerSesion } from "./regalos";

describe("nivelesPermitidos", () => {
  it("con lista vacía permite los 3 niveles", () => expect(nivelesPermitidos([]).length).toBe(3));
  it("el segundo deseo no puede repetir nivel", () =>
    expect(nivelesPermitidos([{ nivel: "normal" }])).toEqual(["sin_costo", "muy_barato"]));
  it("el tercero solo permite el nivel faltante", () =>
    expect(nivelesPermitidos([{ nivel: "normal" }, { nivel: "sin_costo" }])).toEqual(["muy_barato"]));
  it("editar uno de los tres no permite duplicar los otros", () =>
    expect(nivelesPermitidos([{ nivel: "muy_barato" }, { nivel: "normal" }])).toEqual(["sin_costo"]));
  it("editar cuatro deseos no puede eliminar el único nivel obligatorio", () =>
    expect(nivelesPermitidos([{ nivel: "normal" }, { nivel: "normal" }, { nivel: "muy_barato" }])).toEqual(["sin_costo"]));
  it("con 3 deseos del mismo nivel... no puede pasar: con 2 iguales solo deja el que falta", () =>
    expect(nivelesPermitidos([{ nivel: "normal" }, { nivel: "normal" }])).toEqual(["sin_costo", "muy_barato"]));
  it("con los 3 niveles cubiertos, el 4º puede ser cualquiera", () =>
    expect(nivelesPermitidos([{ nivel: "normal" }, { nivel: "sin_costo" }, { nivel: "muy_barato" }]).length).toBe(3));
  it("con 4 deseos no permite más", () =>
    expect(nivelesPermitidos([{ nivel: "normal" }, { nivel: "sin_costo" }, { nivel: "muy_barato" }, { nivel: "normal" }])).toEqual([]));
});

describe("links", () => {
  it.each(["http://example.com", "https://example.com/a", "HTTPS://example.com"])('permite %s', (url) => expect(linkSeguro(url)).toBe(true));
  it.each(["javascript:alert(1)", "data:text/html,test", "ftp://example.com", "//example.com", "no-es-un-link", "https://", "https://example.com\\test"])('rechaza %s', (url) => expect(linkSeguro(url)).toBe(false));
});

it("salir elimina la sesión pero mantiene el nombre después de recargar", () => {
  localStorage.clear();
  guardarSesion({ clave: "clave-de-prueba", nombre: "Ana" });
  guardarSesion(null);
  expect(leerSesion()).toBeNull();
  expect(leerNombre()).toBe("Ana");
});
