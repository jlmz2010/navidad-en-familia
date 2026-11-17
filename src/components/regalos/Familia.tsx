import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { familia, apartar, soltar, nivelInfo, linkSeguro, type DeseoFamilia, type Sesion } from "@/lib/regalos";

export function Familia({ sesion }: { sesion: Sesion }) {
  const [lista, setLista] = useState<DeseoFamilia[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const cargar = () => familia(sesion).then(setLista).catch((e) => toast.error(e.message));
  useEffect(() => { cargar(); }, []);

  if (!lista) return <p className="py-10 text-center text-muted-foreground">Cargando a la familia…</p>;
  if (!lista.length) return <p className="py-10 text-center text-muted-foreground">Todavía nadie más ha escrito su lista. ¡Pásales la clave! 🎄</p>;

  const grupos = lista.reduce<Record<string, DeseoFamilia[]>>((acc, d) => ((acc[d.persona] ??= []).push(d), acc), {});

  async function accion(d: DeseoFamilia) {
    setOcupado(d.id);
    try {
      if (d.estado === "mio") { await soltar(sesion, d.id); toast("Listo, quedó libre otra vez."); }
      else { await apartar(sesion, d.id); toast.success("¡Qué bonito! Ya es tuyo 🎁"); }
    } catch (e) { toast.error((e as Error).message); }
    await cargar(); setOcupado(null);
  }

  return (
    <section className="min-w-0 space-y-6 break-words [overflow-wrap:anywhere]">
      <p className="rounded-2xl bg-muted p-4 text-sm">Si te late regalarle algo a alguien, apártalo aquí para no repetir. Si no, ¡no pasa nada! Lo importante es estar juntos 💛</p>
      {Object.entries(grupos).map(([persona, deseos]) => (
        <div key={persona}>
          <h2 className="mb-2 text-2xl font-bold">{persona}</h2>
          <div className="space-y-3">
            {deseos.map((d) => {
              const n = nivelInfo(d.nivel);
              if (!n) return null;
              const elegido = d.estado === "elegido";
              return (
                <article key={d.id} className={`min-w-0 rounded-2xl border p-4 ${elegido ? "bg-muted text-muted-foreground" : "bg-card shadow-soft"}`}>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${elegido ? "bg-border" : n.clase}`}>{n.emoji} {n.label}</span>
                  <h3 className={`mt-2 text-lg font-semibold ${elegido ? "line-through" : ""}`}>{d.titulo}</h3>
                  {d.nota && <p className="mt-1 text-sm text-muted-foreground">{d.nota}</p>}
                  {linkSeguro(d.link) && !elegido && <a href={d.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-w-0 max-w-full items-center gap-1 break-words text-sm font-semibold text-primary underline">Ver link <ExternalLink className="h-3 w-3 shrink-0" /></a>}
                  <div className="mt-3">
                    {elegido ? <p className="text-sm font-semibold">Ya elegido</p>
                      : d.estado === "mio" ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-secondary">✓ Tú lo regalas</p>
                          <Button variant="ghost" size="sm" disabled={ocupado === d.id} onClick={() => accion(d)}>Deshacer</Button>
                        </div>
                      ) : <Button variant="secondary" disabled={ocupado === d.id} onClick={() => accion(d)} className="w-full rounded-xl font-bold">Yo lo regalo</Button>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
