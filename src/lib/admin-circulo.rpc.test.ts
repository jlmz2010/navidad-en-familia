import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { readFileSync } from "node:fs";

const suite = process.env['ADMIN_QA'] === "1" ? describe : describe.skip;
suite("Administración: RPC reales con círculos temporales", () => {
  type Circulo = { codigo: string; admin_token: string; nombre: string; pin: string };
  let uno: Circulo; let dos: Circulo;
  const temporales: Circulo[] = [];
  async function crear(nombre: string): Promise<Circulo> {
    const pin = crypto.randomUUID();
    const r = await supabase.rpc("crear_circulo", { p_nombre: nombre, p_pin: pin });
    if (r.error) throw new Error("No se pudo crear el círculo QA");
    const c = r.data as unknown as Circulo & { ok: boolean };
    if (!c.ok) throw new Error("No se pudo crear el círculo QA");
    const result = { ...c, pin, nombre }; temporales.push(result); return result;
  }
  beforeAll(async () => { uno = await crear("QA F24 RPC Uno"); dos = await crear("QA F24 RPC Dos"); });
  afterAll(async () => { for (const c of temporales) await supabase.rpc("admin_borrar_circulo_c", { p_token: c.admin_token, p_confirmacion: c.nombre }); });
  it("token inválido y token de otro círculo no acceden al primero", async () => {
    expect((await supabase.rpc("admin_info_c", { p_token: "invalido" })).data).toEqual({ ok: false, error: "ADMIN_INVALIDO" });
    expect((await supabase.rpc("admin_info_c", { p_token: dos.admin_token })).data).toMatchObject({ nombre: dos.nombre, personas: [] });
    expect((await supabase.rpc("admin_quitar_persona_c", { p_token: dos.admin_token, p_persona: "Ana M." })).data).toMatchObject({ error: "PERSONA_NO_EXISTE" });
  });
  it("solo muestra persona y conteo, quitar borra deseos y libera apartados", async () => {
    const guardar = async (persona: string) => {
      const r = await supabase.rpc("guardar_deseo_c", { p_codigo: uno.codigo, p_pin: uno.pin, p_persona: persona, p_id: null as unknown as string, p_titulo: "Contenido privado QA", p_nivel: "normal", p_link: "", p_nota: "Nota privada QA" });
      expect(r.data).toMatchObject({ ok: true }); return (r.data as { id: string }).id;
    };
    const ana = await guardar("Ana M."); await guardar("Beto R."); await guardar("Cata S.");
    await supabase.rpc("apartar_c", { p_codigo: uno.codigo, p_pin: uno.pin, p_persona: "Beto R.", p_id: ana });
    const info = (await supabase.rpc("admin_info_c", { p_token: uno.admin_token })).data as unknown as { personas: object[] };
    expect(info.personas).toHaveLength(3);
    for (const p of info.personas) expect(Object.keys(p).sort()).toEqual(["num_deseos", "persona"]);
    expect(JSON.stringify(info)).not.toMatch(/titulo|nota|apartado|hash|Contenido privado/);
    expect((await supabase.rpc("admin_quitar_persona_c", { p_token: uno.admin_token, p_persona: " beto r. " })).data).toEqual({ ok: true });
    const p = { p_codigo: uno.codigo, p_pin: uno.pin, p_persona: "Beto R." };
    expect((await supabase.rpc("mi_lista_c", p)).data).toMatchObject({ deseos: [] });
    expect((await supabase.rpc("familia_c", { ...p, p_persona: "Cata S." })).data).toMatchObject({ deseos: expect.arrayContaining([expect.objectContaining({ id: ana, estado: "libre" })]) });
  });
  it("PIN: límites 6 caracteres y 72 bytes, bloqueo reiniciado, viejo rechazado", async () => {
    for (const pin of ["12345", "ñ".repeat(37)]) expect((await supabase.rpc("admin_cambiar_pin_c", { p_token: uno.admin_token, p_pin_nuevo: pin })).data).toMatchObject({ error: "PIN_INVALIDO" });
    for (let i = 0; i < 5; i++) await supabase.rpc("entrar_circulo", { p_codigo: uno.codigo, p_pin: "incorrecto" });
    expect((await supabase.rpc("entrar_circulo", { p_codigo: uno.codigo, p_pin: uno.pin })).data).toMatchObject({ error: "BLOQUEADO" });
    const nuevo = crypto.randomUUID();
    expect((await supabase.rpc("admin_cambiar_pin_c", { p_token: uno.admin_token, p_pin_nuevo: nuevo })).data).toEqual({ ok: true });
    expect((await supabase.rpc("entrar_circulo", { p_codigo: uno.codigo, p_pin: uno.pin })).data).toMatchObject({ error: "CIRCULO_O_PIN_INCORRECTO" });
    expect((await supabase.rpc("entrar_circulo", { p_codigo: uno.codigo, p_pin: ` ${nuevo.toUpperCase()} ` })).data).toMatchObject({ ok: true });
    uno.pin = nuevo;
    for (const pin of ["a".repeat(72), "abcdef"]) expect((await supabase.rpc("admin_cambiar_pin_c", { p_token: uno.admin_token, p_pin_nuevo: pin })).data).toEqual({ ok: true });
  });
  it("borrado exige nombre exacto y elimina el círculo y sus deseos", async () => {
    expect((await supabase.rpc("admin_borrar_circulo_c", { p_token: uno.admin_token, p_confirmacion: uno.nombre.toLowerCase() })).data).toMatchObject({ error: "CONFIRMACION_INCORRECTA" });
    expect((await supabase.rpc("admin_borrar_circulo_c", { p_token: uno.admin_token, p_confirmacion: uno.nombre })).data).toEqual({ ok: true });
    expect((await supabase.rpc("admin_info_c", { p_token: uno.admin_token })).data).toMatchObject({ error: "ADMIN_INVALIDO" });
    expect((await supabase.rpc("entrar_circulo", { p_codigo: uno.codigo, p_pin: uno.pin })).data).toMatchObject({ error: "CIRCULO_O_PIN_INCORRECTO" });
  });
  it("reclamar valida PIN antes de informar que ya tiene administrador", async () => {
    expect((await supabase.rpc("reclamar_admin_c", { p_codigo: dos.codigo, p_pin: "incorrecto" })).data).toMatchObject({ error: "CIRCULO_O_PIN_INCORRECTO" });
    expect((await supabase.rpc("reclamar_admin_c", { p_codigo: dos.codigo, p_pin: dos.pin })).data).toMatchObject({ error: "ADMIN_YA_RECLAMADO" });
  });
  it("reclamar sin administrador cuenta 5 fallos, bloquea y genera token una vez", async () => {
    const path = process.env['ADMIN_CLAIM_FIXTURE'];
    if (!path) throw new Error("Falta el círculo temporal sin administrador");
    const c = JSON.parse(readFileSync(path, "utf8")) as { claim: Circulo; blocked: Circulo };
    for (let i = 0; i < 5; i++) {
      expect((await supabase.rpc("reclamar_admin_c", { p_codigo: c.blocked.codigo, p_pin: "incorrecto" })).data).toMatchObject({ error: i === 4 ? "BLOQUEADO" : "CIRCULO_O_PIN_INCORRECTO" });
    }
    expect((await supabase.rpc("entrar_circulo", { p_codigo: c.blocked.codigo, p_pin: c.blocked.pin })).data).toMatchObject({ error: "BLOQUEADO" });
    const r = (await supabase.rpc("reclamar_admin_c", { p_codigo: c.claim.codigo, p_pin: c.claim.pin })).data as { ok: boolean; admin_token: string };
    expect(r.ok).toBe(true); expect(r.admin_token).toMatch(/^[a-f0-9]{64}$/);
    expect((await supabase.rpc("reclamar_admin_c", { p_codigo: c.claim.codigo, p_pin: c.claim.pin })).data).toMatchObject({ error: "ADMIN_YA_RECLAMADO" });
    expect((await supabase.rpc("admin_borrar_circulo_c", { p_token: r.admin_token, p_confirmacion: c.claim.nombre })).data).toEqual({ ok: true });
  });
});