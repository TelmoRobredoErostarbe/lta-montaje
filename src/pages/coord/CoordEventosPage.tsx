import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatoBadgeClass } from "@/lib/formatoColors";
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

      const cpIds = (checkpoints || []).map(c => c.id);
      const { data: fotos } = cpIds.length > 0
        ? await supabase.from("montaje_fotos").select("checkpoint_id").in("checkpoint_id", cpIds)
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

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = eventos.filter(e => e.fecha >= today);
  const past = eventos.filter(e => e.fecha < today);

  function EventCard({ e }: { e: Evento }) {
    const pct = e.total_checkpoints > 0 ? Math.round((e.completados / e.total_checkpoints) * 100) : 0;
    const done = e.completados === e.total_checkpoints && e.total_checkpoints > 0;
    const badgeClass = formatoBadgeClass(e.formato);

    return (
      <button
        onClick={() => navigate(`/evento/${e.id}`)}
        className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.99]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badgeClass}`}>
              {e.formato}
            </span>
            <p className="font-semibold text-slate-900 text-sm truncate">{e.codigo}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><MapPin size={11} />{e.ciudad}</span>
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {new Date(e.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
            </span>
            {e.hora_inicio && (
              <span className="flex items-center gap-1"><Clock size={11} />{e.hora_inicio.slice(0, 5)}</span>
            )}
          </div>
          {e.total_checkpoints > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400">{e.completados}/{e.total_checkpoints} pasos</span>
                {done && <span className="text-[10px] font-semibold text-green-600 flex items-center gap-0.5"><CheckCircle2 size={10} /> Completo</span>}
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full">
                <div
                  className={`h-1.5 rounded-full transition-all ${done ? "bg-green-500" : "bg-slate-900"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
          {e.total_checkpoints === 0 && (
            <p className="text-[10px] text-slate-300 mt-1">Sin checklist asignado</p>
          )}
        </div>
        <ChevronRight size={15} className="text-slate-300 shrink-0" />
      </button>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Mis eventos</h1>
        <p className="text-sm text-slate-400 mt-0.5">Sigue el progreso del montaje</p>
      </div>

      {upcoming.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Próximos</p>
          <div className="space-y-2.5">{upcoming.map(e => <EventCard key={e.id} e={e} />)}</div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Anteriores</p>
          <div className="space-y-2.5">{past.map(e => <EventCard key={e.id} e={e} />)}</div>
        </section>
      )}

      {eventos.length === 0 && (
        <div className="text-center py-20">
          <CalendarDays size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No tienes eventos asignados</p>
        </div>
      )}
    </div>
  );
}
