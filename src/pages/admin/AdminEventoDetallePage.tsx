import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { formatHora, formatTs } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Clock, Image, ChevronDown, ChevronUp } from "lucide-react";

interface Foto { id: string; foto_url: string; mensaje: string | null; created_at: string; coord_nombre: string; }
interface Checkpoint { id: string; nombre: string; descripcion: string | null; orden: number; hora_recordatorio: string | null; fotos: Foto[]; }
interface Evento { id: string; codigo: string; ciudad: string; fecha: string; hora_inicio: string | null; formato: string; coord_nombre: string; }

export function AdminEventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    const { data: ev } = await supabase
      .from("eventos")
      .select("id, codigo, ciudad, fecha, hora_inicio, formato, coordinador_id")
      .eq("id", id!)
      .maybeSingle();
    if (!ev) { setLoading(false); return; }

    const { data: roleData } = await supabase.from("user_roles").select("nombre").eq("user_id", ev.coordinador_id).maybeSingle();
    const { data: cps } = await supabase.from("montaje_checkpoints").select("id, nombre, descripcion, orden, hora_recordatorio").eq("evento_id", id!).order("orden");
    if (!cps || cps.length === 0) { setEvento({ ...ev, coord_nombre: roleData?.nombre || "—" }); setCheckpoints([]); setLoading(false); return; }

    const cpIds = cps.map(c => c.id);
    const { data: fotas } = await supabase.from("montaje_fotos").select("id, checkpoint_id, foto_url, mensaje, created_at, coordinador_id").in("checkpoint_id", cpIds).order("created_at");
    const coordIds = [...new Set((fotas || []).map(f => f.coordinador_id))];
    const { data: coordRoles } = coordIds.length > 0 ? await supabase.from("user_roles").select("user_id, nombre").in("user_id", coordIds) : { data: [] };
    const coordMap = new Map((coordRoles || []).map(r => [r.user_id, r.nombre]));

    const fotosByCp = new Map<string, Foto[]>();
    for (const f of fotas || []) {
      const list = fotosByCp.get(f.checkpoint_id) || [];
      list.push({ ...f, coord_nombre: coordMap.get(f.coordinador_id) || "—" });
      fotosByCp.set(f.checkpoint_id, list);
    }

    setEvento({ ...ev, coord_nombre: roleData?.nombre || "—" });
    const mapped = cps.map(cp => ({ ...cp, fotos: fotosByCp.get(cp.id) || [] }));
    setCheckpoints(mapped);
    // Auto-expand all with photos
    setExpanded(new Set(mapped.filter(c => c.fotos.length > 0).map(c => c.id)));
    setLoading(false);
  }

  const toggle = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const completados = checkpoints.filter(c => c.fotos.length > 0).length;

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!evento) return <div className="p-6 text-center text-gray-400">Evento no encontrado</div>;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><ArrowLeft size={18} /></button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{evento.codigo} · {evento.ciudad}</p>
          <p className="text-xs text-gray-500">{evento.coord_nombre} · {evento.fecha} {evento.hora_inicio ? `· ${formatHora(evento.hora_inicio)}` : ""}</p>
        </div>
        <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">{completados}/{checkpoints.length}</span>
      </div>

      {checkpoints.length > 0 && (
        <div className="px-4 pt-4">
          <div className="w-full h-2 bg-gray-100 rounded-full mb-4">
            <div className={`h-2 rounded-full transition-all ${completados === checkpoints.length ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${(completados / checkpoints.length) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="px-4 space-y-3">
        {checkpoints.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <Image size={36} className="mx-auto mb-3 text-gray-200" />
            No se han generado checkpoints para este evento todavía.
          </div>
        )}
        {checkpoints.map((cp, idx) => {
          const done = cp.fotos.length > 0;
          const open = expanded.has(cp.id);
          return (
            <div key={cp.id} className={`rounded-2xl border ${done ? "border-green-200" : "border-gray-100"} bg-white overflow-hidden`}>
              <button onClick={() => toggle(cp.id)} className="w-full text-left p-4 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {done ? <CheckCircle2 size={15} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{cp.nombre}</p>
                  {cp.descripcion && <p className="text-xs text-gray-400 mt-0.5">{cp.descripcion}</p>}
                  {cp.hora_recordatorio && <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={9} />{formatTs(cp.hora_recordatorio)}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {done && <span className="text-xs text-green-600 font-semibold">{cp.fotos.length} foto{cp.fotos.length > 1 ? "s" : ""}</span>}
                  {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </div>
              </button>

              {open && (
                <div className="px-4 pb-4 space-y-3">
                  {cp.fotos.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Aún no hay fotos subidas para este paso</p>}
                  {cp.fotos.map(f => (
                    <div key={f.id} className="rounded-xl overflow-hidden border border-gray-100">
                      <img
                        src={f.foto_url}
                        alt={cp.nombre}
                        className="w-full max-h-80 object-cover cursor-zoom-in"
                        onClick={() => setLightbox(f.foto_url)}
                      />
                      <div className="px-3 py-2 bg-gray-50">
                        {f.mensaje && <p className="text-sm text-gray-700 mb-1">{f.mensaje}</p>}
                        <p className="text-[10px] text-gray-400">{f.coord_nombre} · {formatTs(f.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="foto" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
