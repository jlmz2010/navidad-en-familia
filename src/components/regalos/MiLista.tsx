import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NIVELES, nivelInfo, nivelesPermitidos, miLista, guardarDeseo, borrarDeseo, type Deseo, type Nivel, type Sesion } from "@/lib/regalos";

type Borrador = { id?: string; titulo: string; nivel: Nivel; link: string; nota: string };

export function MiLista({ sesion }: { sesion: Sesion }) {
  const [lista, setLista] = useState<Deseo[] | null>(null);
  const [edit, setEdit] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => miLista(sesion).then(setLista).catch((e) => toast.error(e.message));
  useEffect(() => { cargar(); }, []);

  if (!lista) return <p className="py-10 text-center text-muted-foreground">Cargando tu lista…</p>;

  const usados = new Set(lista.map((d) => d.nivel));
  const faltan = NIVELES.filter((n) => !usados.has(n.id));
  const permitidosNuevo = nivelesPermitidos(lista);
  const permitidosEdit = edit ? (edit.id ? nivelesPermitidos(lista.filter((d) => d.id !== edit.id)) : permitidosNuevo) : [];

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); if (!edit) return;
    setGuardando(true);
    try { await guardarDeseo(sesion, edit); toast.success("¡Listo, guardado! ✨"); setEdit(null); cargar(); }
    catch (e) { toast.error((e as Error).message); } finally { setGuardando(false); }
  }
  async function borrar(d: Deseo) {
    if (!confirm(`¿Borrar "${d.titulo}"?`)) return;
    try { await borrarDeseo(sesion, d.id); cargar(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-muted p-4 text-sm">
        {faltan.length ? (
          <p>Te faltan <b>{faltan.length}</b> deseo{faltan.length > 1 ? "s" : ""}: uno <b>{faltan.map((f) => f.label).join(", ")}</b>. Puedes agregar un 4º de cualquier nivel si quieres.</p>
        ) : lista.length < 4 ? (
          <p>¡Tu lista está completa! 🎉 Si se te antoja, agrega un 4º deseo de cualquier nivel.</p>
        ) : <p>¡Tu lista está completa con 4 deseos! 🎉</p>}
      </div>

      {lista.map((d) => {
        const n = nivelInfo(d.nivel);
        return (
          <article key={d.id} className="rounded-2xl border bg-card p-4 shadow-soft">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${n.clase}`}>{n.emoji} {n.label}</span>
            <h3 className="mt-2 text-lg font-semibold">{d.titulo}</h3>
            {d.nota && <p className="mt-1 text-sm text-muted-foreground">{d.nota}</p>}
            {d.link && <a href={d.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline">Ver link <ExternalLink className="h-3 w-3" /></a>}
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEdit({ id: d.id, titulo: d.titulo, nivel: d.nivel, link: d.link ?? "", nota: d.nota ?? "" })}><Pencil className="h-4 w-4" /> Editar</Button>
              <Button variant="ghost" size="sm" onClick={() => borrar(d)}><Trash2 className="h-4 w-4" /> Borrar</Button>
            </div>
          </article>
        );
      })}

      {permitidosNuevo.length > 0 && (
        <Button className="h-12 w-full rounded-xl text-base font-bold" onClick={() => setEdit({ titulo: "", nivel: permitidosNuevo[0], link: "", nota: "" })}>
          <Plus className="h-5 w-5" /> Agregar deseo
        </Button>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar deseo" : "Nuevo deseo"}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={guardar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="t">¿Qué te gustaría?</Label>
                <Input id="t" required maxLength={120} value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} className="h-11 text-base" />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Nivel</legend>
                {NIVELES.map((n) => {
                  const ok = permitidosEdit.includes(n.id);
                  return (
                    <label key={n.id} className={`flex items-start gap-3 rounded-xl border p-3 ${edit.nivel === n.id ? "border-primary ring-2 ring-primary/30" : ""} ${ok ? "cursor-pointer" : "opacity-40"}`}>
                      <input type="radio" name="nivel" disabled={!ok} checked={edit.nivel === n.id} onChange={() => setEdit({ ...edit, nivel: n.id })} className="mt-1 accent-primary" />
                      <span><b>{n.emoji} {n.label}</b><br /><span className="text-xs text-muted-foreground">{n.ayuda}</span></span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="space-y-2">
                <Label htmlFor="l">Link (opcional)</Label>
                <Input id="l" type="url" inputMode="url" placeholder="https://" maxLength={500} value={edit.link} onChange={(e) => setEdit({ ...edit, link: e.target.value })} className="h-11 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="n">Nota (opcional)</Label>
                <Textarea id="n" maxLength={300} placeholder="Talla, color, sabor…" value={edit.nota} onChange={(e) => setEdit({ ...edit, nota: e.target.value })} />
              </div>
              <Button type="submit" disabled={guardando || !permitidosEdit.includes(edit.nivel)} className="h-12 w-full rounded-xl text-base font-bold">{guardando ? "Guardando…" : "Guardar"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
