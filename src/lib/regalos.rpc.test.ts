import { afterAll, describe, expect, it } from "vitest";
import { supabase } from "@/integrations/supabase/client";

const clave = process.env.FAMILY_QA_KEY;
const suite = clave ? describe : describe.skip;

suite("reglas por RPC real (base vacía de QA)", () => {
  const ids = new Map<string, string[]>();
  const niveles = ["sin_costo", "muy_barato", "normal"];
  async function guardar(persona: string, nivel: string, link = "", id?: string) {
    return supabase.rpc("guardar_deseo", {
      p_clave: clave ?? "", p_persona: persona, p_id: id as string,
      p_titulo: "QA ciclo 1.1", p_nivel: nivel, p_link: link, p_nota: "",
    });
  }
  afterAll(async () => {
    for (const [persona, deseos] of ids) {
      for (const id of deseos) {
        const { error } = await supabase.rpc("borrar_deseo", { p_clave: clave ?? "", p_persona: persona, p_id: id });
        expect(error).toBeNull();
      }
    }
  });
  it.each(["Ana", "Beto", "Cata"])("%s: niveles únicos, cuarto libre, edición y protocolos", async (persona) => {
    const propios: string[] = [];
    ids.set(persona, propios);
    for (const nivel of niveles) {
      const resultado = await guardar(persona, nivel);
      expect(resultado.error).toBeNull();
      if (resultado.data) propios.push(resultado.data);
      if (propios.length < 3) {
        const repetido = await guardar(persona, nivel);
        expect(repetido.error?.message).toContain("FALTA_NIVEL");
      }
    }
    const primero = propios[0];
    if (!primero) throw new Error("No se creó el deseo inicial");
    expect((await guardar(persona, "normal", "", primero)).error?.message).toContain("FALTA_NIVEL");
    for (const link of ["javascript:alert(1)", "data:text/html,test", "ftp://example.com", "no-es-un-link", "https://"]) {
      expect((await guardar(persona, "sin_costo", link, primero)).error?.message).toContain("LINK_INVALIDO");
    }
    for (const link of ["http://example.com", "https://example.com"]) {
      expect((await guardar(persona, "sin_costo", link, primero)).error).toBeNull();
    }
    for (const nivel of niveles) {
      const cuarto = await guardar(persona, nivel);
      expect(cuarto.error).toBeNull();
      if (!cuarto.data) throw new Error("No se creó el cuarto deseo");
      propios.push(cuarto.data);
      expect((await guardar(persona, "normal")).error?.message).toContain("MAXIMO_4");
      expect((await supabase.rpc("borrar_deseo", { p_clave: clave ?? "", p_persona: persona, p_id: cuarto.data })).error).toBeNull();
      propios.pop();
    }
  });
});