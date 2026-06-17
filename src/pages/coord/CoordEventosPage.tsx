import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatFecha, formatHora } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { CalendarDays, MapPin, Clock, ChevronRight, CheckCircle2 } from "lucide-react";

interface Evento {
  id: string;
  codigo: string;
  ciudad: string;
  fecha: string;
  hora_inicio: string | null;
  formato: string;
  total_checkpoints: number;
  completados: number;
}

export function CoordEventosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: evs } = await supabase
        .from("eventos")
        .select("id, codigo, ciudad, fecha, hora_inicio, formato")
        .or(`coordinador_id.eq.${user.id},coordinador_secundario_id.eq.${user.id}`)
        .order("fecha", { ascending: false });

      if (!evs || evs.length === 0) { setLoading(false); return; }

      const eventoIds = evs.map(e => e.id);
      const { data: checkpoints } = await supabase
        .from("montaje_checkpoints")
        .select("id, evento_id")
        .in("evento_id", eventoIds);

      const checkpointIds = (checkpoints || []).map(c => c.id);
      const { data: fotos } = checkpointIds.length > 0
        ? await supabase.from("montaje_fotos").select("checkpoint_id").in("checkpoint_id", checkpointIds)
        : { data: [] };

      const fotoSet = new Set((fotos || []).map(f => f.checkpoint_id));
      const countByEvento = new Map<string, { total: number; completados: number }>();
      for (const cp of checkpoints || []) {
        const cur = countByEvento.get(cp.evento_id) || { total: 0, completados: 0 };
        cur.total++;
        if (fotoSet.has(cp.id)) cur.completados++;
        countByEvento.set(cp.evento_id, cur);
      }

      setEventos(evs.map(e => ({
        ...e,
        total_checkpoints: countByEvento.get(e.id)?.total ?? 0,
        completados: countByEvento.get(e.id)?.completados ?? 0,
      })));
      setLoading(false);
    })();
  }, [user]);

  const upcoming = eventos.filter(e => e.fecha >= new Date().toISOString().slice(0, 10));
  const past = eventos.filter(e => e.fecha < new Date().toISOString().slice(0, 10));

  function EventCard({ e }: { e: Evento }) {
    const pct = e.total_checkpoints > 0 ? Math.round((e.completados / e.total_checkpoints) * 100) : 0;
    const done = e.completados === e.total_checkpoints && e.total_checkpoints > 0;
    return (
      <button
        onClick={() => navigate(`/evento/${e.id}`)}
        className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow active:scale-[0.99]"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${done ? "bg-green-500" : "bg-gray-900"}`}>
          {done ? <CheckCircle2 size={22} /> : e.formato?.slice(0, 3) || "EVT"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{e.codigo || e.id.slice(0, 8)}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><MapPin size={11} />{e.ciudad}</span>
            <span className="flex items-center gap-1"><CalendarDays size={11} />{formatFecha(e.fecha).split(",")[0]}, {e.fecha.slice(8, 10)}/{e.fecha.slice(5, 7)}</span>
            {e.hora_inicio && <span className="flex items-center gap-1"><Clock size={11} />{formatHora(e.hora_inicio)}</span>}
          </div>
          {e.total_checkpoints > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-400">{e.completados}/{e.total_checkpoints} pasos</span>
                <span className="text-[10px] font-semibold text-gray-600">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full">
                <div className={`h-1.5 rounded-full transition-all ${done ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          {e.total_checkpoints === 0 && (
            <p className="text-[10px] text-gray-400 mt-1">Sin checkpoints asignados aún</p>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0" />
      </button>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mis eventos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sigue el progreso del montaje</p>
      </div>

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Próximos</h2>
          <div className="space-y-3">
            {upcoming.map(e => <EventCard key={e.id} e={e} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Anteriores</h2>
          <div className="space-y-3">
            {past.map(e => <EventCard key={e.id} e={e} />)}
          </div>
        </section>
      )}

      {eventos.length === 0 && (
        <div className="text-center py-16">
          <CalendarDays size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No tienes eventos asignados</p>
        </div>
      )}
    </div>
  );
}
