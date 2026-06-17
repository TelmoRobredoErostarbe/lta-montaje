import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatHora, formatTs } from "@/lib/utils";
import { ArrowLeft, Camera, CheckCircle2, Clock, Upload, X } from "lucide-react";

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

export function CoordEventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeUpload, setActiveUpload] = useState<{ cpId: string; file: File; preview: string } | null>(null);
  const [mensaje, setMensaje] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    load();
  }, [id, user]);

  async function load() {
    setLoading(true);
    const [{ data: ev }, { data: cps }] = await Promise.all([
      supabase.from("eventos").select("id, codigo, ciudad, fecha, hora_inicio, formato").eq("id", id!).maybeSingle(),
      supabase.from("montaje_checkpoints").select("id, nombre, descripcion, orden, hora_recordatorio").eq("evento_id", id!).order("orden"),
    ]);

    if (!ev) { setLoading(false); return; }

    // Auto-generar checkpoints desde plantilla si no hay ninguno
    if ((!cps || cps.length === 0) && ev.formato) {
      await generarCheckpoints(ev);
      const { data: nuevos } = await supabase
        .from("montaje_checkpoints")
        .select("id, nombre, descripcion, orden, hora_recordatorio")
        .eq("evento_id", id!)
        .order("orden");
      await cargarFotos(ev, nuevos || []);
    } else {
      await cargarFotos(ev, cps || []);
    }
    setLoading(false);
  }

  async function generarCheckpoints(ev: Evento) {
    const tipo = ev.formato?.toUpperCase();
    const { data: plantilla } = await supabase
      .from("montaje_plantillas")
      .select("id")
      .eq("tipo_evento", tipo)
      .maybeSingle();
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
      (fotosByCp.get(f.checkpoint_id) || fotosByCp.set(f.checkpoint_id, []).get(f.checkpoint_id)!).push(f);
    }
    setCheckpoints(cps.map(cp => ({ ...cp, fotos: fotosByCp.get(cp.id) || [] })));
  }

  function handleFileSelect(cpId: string, file: File) {
    const preview = URL.createObjectURL(file);
    setActiveUpload({ cpId, file, preview });
    setMensaje("");
  }

  async function subirFoto() {
    if (!activeUpload || !user) return;
    setUploading(activeUpload.cpId);
    const { cpId, file } = activeUpload;
    const ext = file.name.split(".").pop();
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!evento) return <div className="p-6 text-center text-gray-500">Evento no encontrado</div>;

  const completados = checkpoints.filter(c => c.fotos.length > 0).length;

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{evento.codigo}</p>
          <p className="text-xs text-gray-500">{evento.ciudad} · {evento.fecha.slice(8, 10)}/{evento.fecha.slice(5, 7)}/{evento.fecha.slice(0, 4)}{evento.hora_inicio ? ` · ${formatHora(evento.hora_inicio)}` : ""}</p>
        </div>
        <span className="text-xs font-semibold text-gray-500">{completados}/{checkpoints.length}</span>
      </div>

      {/* Progress bar */}
      {checkpoints.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="w-full h-2 bg-gray-100 rounded-full">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${checkpoints.length > 0 ? (completados / checkpoints.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{completados} de {checkpoints.length} pasos completados</p>
        </div>
      )}

      {/* Checkpoints */}
      <div className="px-4 pt-2 space-y-4">
        {checkpoints.length === 0 && (
          <div className="text-center py-16">
            <Clock size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No hay pasos de montaje para este tipo de evento aún.</p>
            <p className="text-gray-300 text-xs mt-1">El admin debe configurar la plantilla primero.</p>
          </div>
        )}

        {checkpoints.map((cp, idx) => {
          const done = cp.fotos.length > 0;
          return (
            <div key={cp.id} className={`rounded-2xl border ${done ? "border-green-200 bg-green-50" : "border-gray-100 bg-white"} overflow-hidden`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {done ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{cp.nombre}</p>
                    {cp.descripcion && <p className="text-xs text-gray-500 mt-0.5">{cp.descripcion}</p>}
                    {cp.hora_recordatorio && (
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={10} /> Recordatorio: {formatTs(cp.hora_recordatorio)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Fotos existentes */}
                {cp.fotos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {cp.fotos.map(f => (
                      <div key={f.id} className="rounded-xl overflow-hidden border border-green-200">
                        <img src={f.foto_url} alt={cp.nombre} className="w-full max-h-64 object-cover" />
                        {f.mensaje && <p className="text-xs text-gray-600 px-3 py-2 bg-white">{f.mensaje}</p>}
                        <p className="text-[10px] text-gray-400 px-3 pb-2">{formatTs(f.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón subir foto */}
                <div className="mt-3">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={activeUpload?.cpId === cp.id ? fileInputRef : undefined}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(cp.id, f); e.target.value = ""; }}
                    id={`file-${cp.id}`}
                  />
                  <label
                    htmlFor={`file-${cp.id}`}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${done ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-900 text-white hover:bg-gray-700"}`}
                  >
                    <Camera size={15} />
                    {done ? "Añadir otra foto" : "Subir foto"}
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmación de foto */}
      {activeUpload && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <p className="text-white font-semibold">Confirmar foto</p>
            <button onClick={() => setActiveUpload(null)} className="text-white/70 hover:text-white">
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <img src={activeUpload.preview} alt="preview" className="max-h-[55vh] w-full object-contain rounded-xl" />
          </div>
          <div className="p-4 space-y-3">
            <input
              type="text"
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Mensaje opcional (ej: Escenario listo)"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/40 focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={subirFoto}
              disabled={!!uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={16} />}
              {uploading ? "Subiendo…" : "Confirmar y subir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
