import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { FORMATO_COLOR } from "@/lib/formatoColors";
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

      const { data: valorRows } = cpIds.length > 0
        ? await supabase.from("montaje_checkpoints").select("id, valor").in("id", cpIds).not("valor", "is", null)
        : { data: [] };

      const fotoSet = new Set((fotos || []).map(f => f.checkpoint_id));
      const valorSet = new Set((valorRows || []).map(r => r.id));
      const countByEvento = new Map<string, { total: number; completados: number }>();
      for (const cp of checkpoints || []) {
        const cur = countByEvento.get(cp.evento_id) || { total: 0, completados: 0 };
        cur.total++;
        if (fotoSet.has(cp.id) || valorSet.has(cp.id)) cur.completados++;
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
    const fc = FORMATO_COLOR[e.formato?.toUpperCase()] ?? { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };

    return (
      <button
        onClick={() => navigate(`/evento/${e.id}`)}
        className="w-full text-left card-crm card-crm-hover overflow-hidden focus:outline-none"
      >
        {/* Accent top bar */}
        {done
          ? <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />
          : e.fecha >= today
          ? <div className="h-0.5" style={{ background: "hsl(24 95% 53%)" }} />
          : null
        }
        <div className="p-4 flex items-center gap-3.5">
          {/* Circular progress */}
          {e.total_checkpoints > 0 ? (
            <div className="shrink-0 relative w-12 h-12">
              <svg width="48" height="48" className="-rotate-90">
                <circle cx="24" cy="24" r="19" fill="none" stroke="hsl(220 13% 91%)" strokeWidth="3" />
                <circle cx="24" cy="24" r="19" fill="none"
                  stroke={done ? "#10b981" : pct > 0 ? "hsl(24 95% 53%)" : "hsl(218 11% 65%)"}
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={2 * Math.PI * 19 * (1 - pct / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: "hsl(222 47% 11%)" }}>
                {pct}%
              </span>
            </div>
          ) : (
            <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsl(220 13% 95%)" }}>
              <span className="text-[11px] font-bold uppercase" style={{ color: "hsl(218 11% 65%)" }}>—</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${fc.bg} ${fc.text} ${fc.border}`}>
                {e.formato}
              </span>
              {done && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                  <CheckCircle2 size={10} /> Completo
                </span>
              )}
            </div>
            <p className="font-semibold text-sm truncate" style={{ color: "hsl(222 47% 11%)" }}>{e.codigo}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(218 11% 65%)" }}>
                <MapPin size={10} /> {e.ciudad}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(218 11% 65%)" }}>
                <CalendarDays size={10} />
                {new Date(e.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
              </span>
              {e.hora_inicio && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(218 11% 65%)" }}>
                  <Clock size={10} /> {e.hora_inicio.slice(0, 5)}
                </span>
              )}
            </div>
            {e.total_checkpoints > 0 && (
              <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220 13% 91%)" }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: done ? "#10b981" : "hsl(24 95% 53%)" }}
                />
              </div>
            )}
          </div>
          <ChevronRight size={15} style={{ color: "hsl(218 11% 65%)" }} className="shrink-0" />
        </div>
      </button>
    );
  }

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="card-crm p-4">
          <div className="flex gap-3.5 items-center">
            <div className="w-12 h-12 rounded-full skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 skeleton rounded w-1/3" />
              <div className="h-4 skeleton rounded w-2/3" />
              <div className="h-2 skeleton rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 animate-fade-in">
      {/* Page header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "hsl(24 95% 53%)" }}>Coordinador</p>
        <h1 className="text-xl font-bold" style={{ color: "hsl(222 47% 11%)" }}>Mis eventos</h1>
        <p className="text-sm mt-0.5" style={{ color: "hsl(220 9% 46%)" }}>Seguimiento del montaje</p>
      </div>

      {upcoming.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(218 11% 65%)" }}>
            Próximos · {upcoming.length}
          </p>
          <div className="space-y-2.5">{upcoming.map(e => <EventCard key={e.id} e={e} />)}</div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(218 11% 65%)" }}>
            Anteriores · {past.length}
          </p>
          <div className="space-y-2.5">{past.map(e => <EventCard key={e.id} e={e} />)}</div>
        </section>
      )}

      {eventos.length === 0 && (
        <div className="text-center py-24">
          <CalendarDays size={40} className="mx-auto mb-4" style={{ color: "hsl(220 13% 88%)" }} />
          <p className="text-sm font-medium" style={{ color: "hsl(220 9% 46%)" }}>No tienes eventos asignados</p>
          <p className="text-xs mt-1" style={{ color: "hsl(218 11% 65%)" }}>Los eventos aparecerán aquí cuando seas asignado</p>
        </div>
      )}
    </div>
  );
}
