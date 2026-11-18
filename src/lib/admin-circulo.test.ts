import { describe, it, expect } from "vitest";
import { extraerToken, validarToken, linkAdministrador, entregarToken, tomarToken, mensajeAdmin } from "./admin-circulo";

describe("Helpers de administración", () => {
  const token = "a".repeat(64);
  it("acepta exactamente 64 hex, sin normalizar el secreto", () => {
    expect(validarToken(token)).toBe(true);
    expect(validarToken("F".repeat(64))).toBe(true);
    for (const t of ["a".repeat(63), "a".repeat(65), "g".repeat(64), ` ${token}`]) expect(validarToken(t)).toBe(false);
  });
  it("extrae token solo o link HTTP(S), no query ni otros protocolos", () => {
    expect(extraerToken(` ${token} `)).toBe(token);
    expect(extraerToken(`https://example.test/navidad-en-familia/#/admin/${token}`)).toBe(token);
    expect(extraerToken(`#/admin/${token}`)).toBe(token);
    for (const t of [`javascript:#/admin/${token}`, `https://example.test/?token=${token}`, `#/admin/${token}/otro`]) expect(extraerToken(t)).toBeNull();
  });
  it("conserva la base de GitHub Pages y admite base vacía", () => {
    expect(linkAdministrador("https://example.test", "/navidad-en-familia/", token)).toBe(`https://example.test/navidad-en-familia/#/admin/${token}`);
    expect(linkAdministrador("https://example.test/", "", token)).toBe(`https://example.test/#/admin/${token}`);
    expect(linkAdministrador("https://example.test", undefined, token)).toBe(`https://example.test/#/admin/${token}`);
  });
  it("el traspaso de memoria se consume una sola vez sin almacenamiento", () => {
    localStorage.clear(); sessionStorage.clear(); entregarToken(token);
    expect(tomarToken()).toBe(token); expect(tomarToken()).toBeNull();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it("no incluye secretos en errores y muestra minutos del bloqueo", () => {
    expect(mensajeAdmin(token)).not.toContain(token);
    expect(mensajeAdmin("BLOQUEADO", 7)).toContain("7 minutos");
  });
});