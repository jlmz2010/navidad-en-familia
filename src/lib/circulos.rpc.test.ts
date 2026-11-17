// Opt-in: creates two isolated QA circles; cleanup is performed by the QA operator.
import { describe, expect, it } from "vitest";
import { supabase } from "@/integrations/supabase/client";

const suite = process.env['CIRCLE_QA'] === "1" ? describe : describe.skip;
suite("RPCs: aislamiento real de dos círculos", () => {
  it("no permite leer, editar, borrar, apartar o soltar deseos del otro círculo", async () => {
    const pin = `QA-${crypto.randomUUID()}`;
    const circulos: string[] = [];
    for (const nombre of ["QA F2.3 Uno", "QA F2.3 Dos"]) {
      const r = await supabase.rpc("crear_circulo", { p_nombre: nombre, p_pin: pin });
      expect(r.error).toBeNull();
      const data = r.data as { ok: boolean; codigo: string };
      expect(data.ok).toBe(true); circulos.push(data.codigo);
    }
    const [uno, dos] = circulos;
    if (!uno || !dos) throw new Error("Faltan círculos de prueba");
    const p = { p_codigo: uno, p_pin: pin, p_persona: "Ana M." };
    const guardar = (codigo: string, nivel: string, id?: string, link = "") => supabase.rpc("guardar_deseo_c", { ...p, p_codigo: codigo, p_id: (id ?? null) as unknown as string, p_titulo: "QA regalo", p_nivel: nivel, p_link: link, p_nota: "" });
    const primero = (await guardar(uno, "sin_costo")).data as { ok: boolean; id: string };
    expect(primero.ok).toBe(true);
    expect((await guardar(uno, "sin_costo")).data).toMatchObject({ ok: false, error: "FALTA_NIVEL" });
    expect((await guardar(uno, "sin_costo", primero.id, "javascript:alert(1)")).data).toMatchObject({ ok: false, error: "LINK_INVALIDO" });
    for (const nivel of ["muy_barato", "normal", "normal"]) expect((await guardar(uno, nivel)).data).toMatchObject({ ok: true });
    expect((await guardar(uno, "normal")).data).toMatchObject({ ok: false, error: "MAXIMO_4" });
    const otro = { ...p, p_codigo: dos };
    expect((await supabase.rpc("mi_lista_c", otro)).data).toMatchObject({ ok: true, deseos: [] });
    expect((await supabase.rpc("familia_c", { ...otro, p_persona: "Beto R." })).data).toMatchObject({ ok: true, deseos: [] });
    expect((await guardar(dos, "normal", primero.id)).data).toMatchObject({ ok: false, error: "NO_ENCONTRADO" });
    expect((await supabase.rpc("apartar_c", { ...otro, p_persona: "Beto R.", p_id: primero.id })).data).toMatchObject({ ok: false });
    expect((await supabase.rpc("soltar_c", { ...otro, p_persona: "Beto R.", p_id: primero.id })).data).toMatchObject({ ok: false });
    await supabase.rpc("borrar_deseo_c", { ...otro, p_id: primero.id });
    const lista = (await supabase.rpc("mi_lista_c", p)).data as { deseos: { id: string }[] };
    expect(lista.deseos).toHaveLength(4);
    expect(lista.deseos.some((d) => d.id === primero.id)).toBe(true);
    expect(JSON.stringify(lista)).not.toContain("apartado_por");
    for (const d of lista.deseos) await supabase.rpc("borrar_deseo_c", { ...p, p_id: d.id });
    // Only temporary sandbox output holds generated credentials for browser verification.
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync("/tmp/browser/f23", { recursive: true });
    writeFileSync("/tmp/browser/f23/circulos.json", JSON.stringify({ uno, dos, pin }), { mode: 0o600 });
  }, 60000);
});