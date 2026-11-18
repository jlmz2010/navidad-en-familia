import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AVISO_ADMIN } from "@/lib/admin-circulo";

export function Dato({ titulo, valor, ayuda }: { titulo: string; valor: string; ayuda?: string }) {
  async function copiar() {
    try { await navigator.clipboard.writeText(valor); toast.success("¡Copiado!"); }
    catch { toast.error("No se pudo copiar; mantén presionado el texto para copiarlo."); }
  }
  return <div className="min-w-0 space-y-2">
    <p className="text-sm font-semibold">{titulo}</p>
    <div className="flex min-w-0 items-start gap-2">
      <p className="min-w-0 flex-1 select-all break-words rounded-xl bg-muted px-3 py-2 font-mono text-sm [overflow-wrap:anywhere]">{valor}</p>
      <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" onClick={copiar} aria-label={`Copiar ${titulo.toLowerCase()}`} title={`Copiar ${titulo.toLowerCase()}`}><Copy className="h-4 w-4" /></Button>
    </div>
    {ayuda && <p className="text-sm text-muted-foreground">{ayuda}</p>}
  </div>;
}
export function ClavesAdministrador({ token, link }: { token: string; link: string }) {
  return <div className="min-w-0 space-y-4 rounded-2xl border-2 border-primary/40 p-3">
    <Dato titulo="Clave de administrador" valor={token} />
    <Dato titulo="Link de administrador" valor={link} />
    <p className="text-sm text-muted-foreground">⚠️ {AVISO_ADMIN}</p>
  </div>;
}