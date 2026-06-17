import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatoBadgeClass } from "@/lib/formatoColors";
import { formatHora, formatTs } from "@/lib/utils";
import { ArrowLeft, Camera, CheckCircle2, Clock, Upload, X, Settings } from "lucide-react";

interface Checkpoint {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  hora_recordatorio: string | null;
  fotos: { id: string; foto_url: string; mensaje: string | null; created_at: string }[];
}

interface Evento {
  id: string;
  codigo: string;
  ciudad: string;
  fecha: string;
  hora_inicio: string | null;
  formato: string;
}

interface Plantilla { id: string; tipo_evento: string; nombre: string; }

export function CoordEventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeUpload, setActiveUpload] = useState<{ cpId: string; file: File; preview: string } | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [applyingPlantilla, setApplyingPlantilla] = useState(false);

  useEffect(() => { if (id && user) load(); }, [id, user]);

  async function load() {
    setLoading(true);
    const [{ data: ev }, { data: cps }, { data: plantas }] = await Promise.all([
      supabase.from("eventos").select("id, codigo, ciudad, fecha, hora_inicio, formato").eq("id", id!).maybeSingle(),
      supabase.from("montaje_checkpoints").select("id, nombre, descripcion, orden, hora_recordatorio").eq("evento_id", id!).order("orden"),
      supabase.from("montaje_plantillas").select("id, tipo_evento, nombre").order("tipo_evento"),
    ]);

    if (!ev) { setLoading(false); return; }
    setPlantillas(plantas || []);

    // Auto-generar desde plantilla si no hay checkpoints
    if (!cps || cps.length === 0) {
      await generarCheckpointsDesde(ev, plantas || []);
      const { data: nuevos } = await supabase
        .from("montaje_checkpoints")
        .select("id, nombre, descripcion, orden, hora_recordatorio")
        .eq("evento_id", id!)
        .order("orden");
      await cargarFotos(ev, nuevos || []);
    } else {
      await cargarFotos(ev, cps);
    }
    setLoading(false);
  }

  async function generarCheckpointsDesde(ev: Evento, plantas: Plantilla[]) {
    const tipo = ev.formato?.toUpperCase();
    const plantilla = plantas.find(p => p.tipo_evento === tipo);
    if (!plantilla) return;

    const { data: items } = await supabase
      .from("montaje_plantilla_items")
      .select("*")
      .eq("plantilla_id", plantilla.id)
      .order("orden");
    if (!items || items.length === 0) return;

    const horaBase = ev.hora_inicio ? `${ev.fecha}T${ev.hora_inicio}` : `${ev.fecha}T10:00:00`;
    const baseTs = new Date(horaBase).getTime();

    await supabase.from("montaje_checkpoints").insert(
      items.map((item: any) => ({
        evento_id: ev.id,
        plantilla_item_id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion,
        orden: item.orden,
        hora_recordatorio: new Date(baseTs + item.offset_minutos * 60000).toISOString(),
      }))
    );
  }

  async function cargarFotos(ev: Evento, cps: any[]) {
    setEvento(ev);
    if (cps.length === 0) { setCheckpoints([]); return; }
    const cpIds = cps.map(c => c.id);
    const { data: fotos } = await supabase
      .from("montaje_fotos")
      .select("id, checkpoint_id, foto_url, mensaje, created_at")
      .in("checkpoint_id", cpIds)
      .order("created_at");

    const fotosByCp = new Map<string, any[]>();
    for (const f of fotos || []) {
      const arr = fotosByCp.get(f.checkpoint_id) || [];
      arr.push(f);
      fotosByCp.set(f.checkpoint_id, arr);
    }
    setCheckpoints(cps.map(cp => ({ ...cp, fotos: fotosByCp.get(cp.id) || [] })));
  }

  async function aplicarPlantilla(plantillaId: string, clear = true) {
    if (!evento) return;
    setApplyingPlantilla(true);
    if (clear) {
      // Borrar checkpoints existentes (las fotos se borran por CASCADE)
      await supabase.from("montaje_checkpoints").delete().eq("evento_id", evento.id);
    }
    const { data: items } = await supabase
      .from("montaje_plantilla_items")
      .select("*")
      .eq("plantilla_id", plantillaId)
      .order("orden");

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

  function handleFileSelect(cpId: string, file: File) {
    setActiveUpload({ cpId, file, preview: URL.createObjectURL(file) });
    setMensaje("");
  }

  async function subirFoto() {
    if (!activeUpload || !user) return;
    setUploading(activeUpload.cpId);
    const { cpId, file } = activeUpload;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `montaje/${id}/${cpId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("montaje-fotos").upload(path, file);
    if (upErr) { alert("Error subiendo imagen: " + upErr.message); setUploading(null); return; }

    const { data: { publicUrl } } = supabase.storage.from("montaje-fotos").getPublicUrl(path);
    await supabase.from("montaje_fotos").insert({
      checkpoint_id: cpId,
      coordinador_id: user.id,
      foto_url: publicUrl,
      mensaje: mensaje || null,
    });

    setActiveUpload(null);
    setMensaje("");
    setUploading(null);
    await load();
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  if (!evento) return <div className="p-6 text-center text-slate-400">Evento no encontrado</div>;

  const completados = checkpoints.filter(c => c.fotos.length > 0).length;
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
            {evento.hora_inicio ? ` · ${formatHora(evento.hora_inicio)}` : ""}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowPlantillaModal(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 shrink-0"
            title="Cambiar plantilla"
          >
            <Settings size={16} className="text-slate-500" />
          </button>
        )}
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
            <p className="text-slate-300 text-xs mt-1">
              {isAdmin ? "Pulsa el icono de ajustes para aplicar una plantilla." : "El admin debe configurar la plantilla para este tipo de evento."}
            </p>
          </div>
        )}

        {checkpoints.map((cp, idx) => {
          const done = cp.fotos.length > 0;
          return (
            <div key={cp.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${done ? "border-green-200" : "border-slate-100"}`}>
              <div className="p-4">
                {/* Header del checkpoint */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${done ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {done ? <CheckCircle2 size={15} /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${done ? "text-green-800" : "text-slate-900"}`}>{cp.nombre}</p>
                    {cp.descripcion && <p className="text-xs text-slate-400 mt-0.5">{cp.descripcion}</p>}
                    {cp.hora_recordatorio && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock size={9} />
                        {formatTs(cp.hora_recordatorio)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Fotos existentes */}
                {cp.fotos.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {cp.fotos.map(f => (
                      <div key={f.id} className="rounded-xl overflow-hidden border border-slate-100">
                        <img src={f.foto_url} alt={cp.nombre} className="w-full max-h-64 object-cover" />
                        {f.mensaje && <p className="text-xs text-slate-600 px-3 py-2">{f.mensaje}</p>}
                        <p className="text-[10px] text-slate-400 px-3 pb-2">{formatTs(f.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    id={`file-${cp.id}`}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(cp.id, f); e.target.value = ""; }}
                  />
                  <label
                    htmlFor={`file-${cp.id}`}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                      done ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200" : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    <Camera size={14} />
                    {done ? "Añadir otra foto" : "Subir foto"}
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal selección plantilla (solo admin) */}
      {showPlantillaModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowPlantillaModal(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Aplicar plantilla</h3>
              <button onClick={() => setShowPlantillaModal(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-400">Selecciona una plantilla para reemplazar el checklist actual. Se perderán las fotos existentes.</p>
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
              {plantillas.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No hay plantillas configuradas aún</p>}
            </div>
            {applyingPlantilla && (
              <div className="flex items-center justify-center py-2 gap-2 text-sm text-slate-500">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                Aplicando plantilla…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmación foto */}
      {activeUpload && (
        <div className="fixed inset-0 bg-black/85 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <p className="text-white font-semibold text-sm">Confirmar foto</p>
            <button onClick={() => setActiveUpload(null)} className="text-white/60 hover:text-white"><X size={22} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <img src={activeUpload.preview} alt="preview" className="max-h-[55vh] w-full object-contain rounded-2xl" />
          </div>
          <div className="p-4 space-y-3">
            <input
              type="text"
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Mensaje opcional (ej: Escenario listo)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/40"
            />
            <button
              onClick={subirFoto}
              disabled={!!uploading}
              className="w-full bg-white text-slate-900 font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" /> : <Upload size={16} />}
              {uploading ? "Subiendo…" : "Confirmar y subir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
