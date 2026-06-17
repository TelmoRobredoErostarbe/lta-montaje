import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { formatHora, formatTs } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Clock, Settings, ChevronDown, ChevronUp, X } from "lucide-react";
import { formatoBadgeClass } from "@/lib/formatoColors";

interface Foto { id: string; foto_url: string; mensaje: string | null; created_at: string; coord_nombre: string; }
interface Checkpoint { id: string; nombre: string; descripcion: string | null; orden: number; hora_recordatorio: string | null; fotos: Foto[]; }
interface Evento { id: string; codigo: string; ciudad: string; fecha: string; hora_inicio: string | null; formato: string; coord_nombre: string; }
interface Plantilla { id: string; tipo_evento: string; nombre: string; }

export function AdminEventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [applyingPlantilla, setApplyingPlantilla] = useState(false);

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    setLoading(true);
    const [{ data: ev }, { data: plantas }] = await Promise.all([
      supabase.from("eventos").select("id, codigo, ciudad, fecha, hora_inicio, formato, coordinador_id").eq("id", id!).maybeSingle(),
      supabase.from("montaje_plantillas").select("id, tipo_evento, nombre").order("tipo_evento"),
    ]);

    if (!ev) { setLoading(false); return; }
    setPlantillas(plantas || []);

    const { data: roleData } = await supabase.from("user_roles").select("nombre").eq("user_id", ev.coordinador_id).maybeSingle();
    const { data: cps } = await supabase.from("montaje_checkpoints").select("id, nombre, descripcion, orden, hora_recordatorio").eq("evento_id", id!).order("orden");

    const eventoData: Evento = { ...ev, coord_nombre: roleData?.nombre || "—" };
    setEvento(eventoData);

    if (!cps || cps.length === 0) { setCheckpoints([]); setLoading(false); return; }

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

    const mapped = cps.map(cp => ({ ...cp, fotos: fotosByCp.get(cp.id) || [] }));
    setCheckpoints(mapped);
    setExpanded(new Set(mapped.filter(c => c.fotos.length > 0).map(c => c.id)));
    setLoading(false);
  }

  async function aplicarPlantilla(plantillaId: string) {
    if (!evento) return;
    setApplyingPlantilla(true);
    await supabase.from("montaje_checkpoints").delete().eq("evento_id", evento.id);

    const { data: items } = await supabase.from("montaje_plantilla_items").select("*").eq("plantilla_id", plantillaId).order("orden");
    if (items && items.length > 0) {
      const horaBase = evento.hora_inicio ? `${evento.fecha}T${evento.hora_inicio}` : `${evento.fecha}T10:00:00`;
      const baseTs = new Date(horaBase).getTime();
      await supabase.from("montaje_checkpoints").insert(
        items.map((item: any) => ({
          evento_id: evento.id,
          plantilla_item_id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          orden: item.orden,
          hora_recordatorio: new Date(baseTs + item.offset_minutos * 60000).toISOString(),
        }))
      );
    }
    setShowPlantillaModal(false);
    setApplyingPlantilla(false);
    await load();
  }

  const toggle = (cpId: string) => setExpanded(prev => { const s = new Set(prev); s.has(cpId) ? s.delete(cpId) : s.add(cpId); return s; });
  const completados = checkpoints.filter(c => c.fotos.length > 0).length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );
  if (!evento) return <div className="p-6 text-center text-slate-400">Evento no encontrado</div>;

  const badgeClass = formatoBadgeClass(evento.formato);

  return (
    <div className="max-w-lg mx-auto pb-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 shrink-0 mt-0.5">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badgeClass}`}>{evento.formato}</span>
            <h1 className="font-semibold text-slate-900 text-base">{evento.codigo}</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {evento.ciudad} · {new Date(evento.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
            {evento.hora_inicio ? ` · ${formatHora(evento.hora_inicio)}` : ""} · {evento.coord_nombre}
          </p>
        </div>
        <button
          onClick={() => setShowPlantillaModal(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 shrink-0"
          title="Cambiar plantilla"
        >
          <Settings size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Progress */}
      {checkpoints.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Progreso del montaje</span>
              <span className="text-xs font-semibold text-slate-900">{completados}/{checkpoints.length}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full">
              <div
                className={`h-2 rounded-full transition-all ${completados === checkpoints.length ? "bg-green-500" : "bg-slate-800"}`}
                style={{ width: `${checkpoints.length > 0 ? (completados / checkpoints.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Checkpoints */}
      <div className="px-4 space-y-3">
        {checkpoints.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <Settings size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">Sin checklist configurado</p>
            <p className="text-slate-300 text-xs mt-1">Aplica una plantilla con el icono de ajustes</p>
          </div>
        )}

        {checkpoints.map((cp, idx) => {
          const done = cp.fotos.length > 0;
          const open = expanded.has(cp.id);
          return (
            <div key={cp.id} className={`bg-white rounded-2xl border overflow-hidden ${done ? "border-green-200" : "border-slate-100"}`}>
              <button onClick={() => toggle(cp.id)} className="w-full text-left p-4 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${done ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {done ? <CheckCircle2 size={15} /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${done ? "text-green-800" : "text-slate-900"}`}>{cp.nombre}</p>
                  {cp.descripcion && <p className="text-xs text-slate-400 mt-0.5">{cp.descripcion}</p>}
                  {cp.hora_recordatorio && (
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={9} />{formatTs(cp.hora_recordatorio)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {done && <span className="text-xs text-green-600 font-semibold">{cp.fotos.length} foto{cp.fotos.length > 1 ? "s" : ""}</span>}
                  {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
              </button>

              {open && (
                <div className="px-4 pb-4 space-y-3">
                  {cp.fotos.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Aún no hay fotos para este paso</p>
                  )}
                  {cp.fotos.map(f => (
                    <div key={f.id} className="rounded-xl overflow-hidden border border-slate-100">
                      <img
                        src={f.foto_url}
                        alt={cp.nombre}
                        className="w-full max-h-80 object-cover cursor-zoom-in"
                        onClick={() => setLightbox(f.foto_url)}
                      />
                      <div className="px-3 py-2 bg-slate-50">
                        {f.mensaje && <p className="text-sm text-slate-700 mb-1">{f.mensaje}</p>}
                        <p className="text-[10px] text-slate-400">{f.coord_nombre} · {formatTs(f.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal plantillas */}
      {showPlantillaModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowPlantillaModal(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Aplicar plantilla</h3>
              <button onClick={() => setShowPlantillaModal(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-400">Reemplaza el checklist actual. Se perderán las fotos existentes.</p>
            <div className="space-y-2">
              {plantillas.map(p => (
                <button
                  key={p.id}
                  onClick={() => aplicarPlantilla(p.id)}
                  disabled={applyingPlantilla}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-3 flex items-center justify-between transition-colors disabled:opacity-50"
                >
                  <div>
                    <p className="font-medium text-sm text-slate-900">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{p.tipo_evento}</p>
                  </div>
                  {p.tipo_evento === evento.formato?.toUpperCase() && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Por defecto</span>
                  )}
                </button>
              ))}
              {plantillas.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No hay plantillas</p>}
            </div>
            {applyingPlantilla && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                Aplicando…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="foto" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
