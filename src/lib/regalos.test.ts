import { describe, it, expect } from "vitest";
import { nivelesPermitidos } from "./regalos";

describe("nivelesPermitidos", () => {
  it("con lista vacía permite los 3 niveles", () => expect(nivelesPermitidos([]).length).toBe(3));
  it("con 3 deseos del mismo nivel... no puede pasar: con 2 iguales solo deja el que falta", () =>
    expect(nivelesPermitidos([{ nivel: "normal" }, { nivel: "normal" }])).toEqual(["sin_costo", "muy_barato"]));
  it("con los 3 niveles cubiertos, el 4º puede ser cualquiera", () =>
    expect(nivelesPermitidos([{ nivel: "normal" }, { nivel: "sin_costo" }, { nivel: "muy_barato" }]).length).toBe(3));
  it("con 4 deseos no permite más", () =>
    expect(nivelesPermitidos([{ nivel: "normal" }, { nivel: "sin_costo" }, { nivel: "muy_barato" }, { nivel: "normal" }])).toEqual([]));
});
