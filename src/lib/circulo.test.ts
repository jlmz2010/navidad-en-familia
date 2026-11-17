import { describe, it, expect } from "vitest";
import { linkCirculo, textoInvitacion, textoPin, urlWhatsApp, validarNombreCirculo, validarPin } from "./circulo";

describe("linkCirculo", () => {
  it("sin BASE_URL", () => expect(linkCirculo("https://a.app", "/", "ABC")).toBe("https://a.app/#/c/ABC"));
  it("BASE_URL vacío", () => expect(linkCirculo("https://a.app", "", "ABC")).toBe("https://a.app/#/c/ABC"));
  it("con BASE_URL de GitHub Pages", () =>
    expect(linkCirculo("https://x.github.io", "/navidad-en-familia/", "ABC")).toBe("https://x.github.io/navidad-en-familia/#/c/ABC"));
  it("BASE_URL sin diagonal final", () =>
    expect(linkCirculo("https://x.github.io", "/navidad-en-familia", "ABC")).toBe("https://x.github.io/navidad-en-familia/#/c/ABC"));
});

describe("WhatsApp", () => {
  it("invitación sin PIN y codificada", () => {
    const t = textoInvitacion("Navidad & Cía", "https://a.app/#/c/ABC");
    expect(t).toBe('Te invito a mi círculo de regalos de Navidad "Navidad & Cía". Entra aquí: https://a.app/#/c/ABC');
    const url = urlWhatsApp(t);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).not.toMatch(/ |#|"/);
    expect(url).toContain("%26");
    expect(decodeURIComponent(url.slice(20))).toBe(t);
  });
  it("PIN aparte", () => expect(urlWhatsApp(textoPin("pino 99"))).toBe("https://wa.me/?text=El%20PIN%20de%20nuestro%20c%C3%ADrculo%20es%3A%20pino%2099"));
});

describe("validaciones", () => {
  it("nombre vacío", () => expect(validarNombreCirculo("   ")).toBe("NOMBRE_INVALIDO"));
  it("nombre de 60 ok, 61 no", () => {
    expect(validarNombreCirculo("a".repeat(60))).toBeNull();
    expect(validarNombreCirculo("a".repeat(61))).toBe("NOMBRE_INVALIDO");
  });
  it("PIN de 5 es corto (espacios no cuentan)", () => expect(validarPin("  abcde  ")).toBe("PIN_CORTO"));
  it("PIN de 6 ok", () => expect(validarPin("abcdef", "abcdef")).toBeNull());
  it("PIN de más de 72 bytes", () => {
    expect(validarPin("a".repeat(72))).toBeNull();
    expect(validarPin("ñ".repeat(37))).toBe("PIN_LARGO");
  });
  it("PIN no coincide", () => expect(validarPin("abcdef", "abcdeg")).toBe("PIN_NO_COINCIDE"));
});
