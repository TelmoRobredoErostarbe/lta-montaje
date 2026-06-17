import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { MapPin, ChevronRight, CalendarDays, CheckCircle2, Search } from "lucide-react";
import { formatoBadgeClass } from "@/lib/formatoColors";

interface EventoAdmin {
  id: string;
  codigo: string;
  ciudad: string;
  fecha: string;
  formato: string;
  coord_nombre: string;
  total: number;
  completados: number;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: evs } = await supabase
      .from("eventos")
      .select("id, codigo, ciudad, fecha, formato, coordinador_id")
      .not("coordinador_id", "is", null)
      .order("fecha", { ascending: false })
      .limit(100);

    if (!evs || evs.length === 0) { setLoading(false); return; }

    const coordIds = [...new Set(evs.map(e => e.coordinador_id).filter(Boolean))];
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, nombre")
      .in("user_id", coordIds);
    const roleMap = new Map((roles || []).map(r => [r.user_id, r.nombre]));

    const eventoIds = evs.map(e => e.id);
    const { data: cps } = await supabase
      .from("montaje_checkpoints")
      .select("id, evento_id")
      .in("evento_id", eventoIds);

    const cpIds = (cps || []).map(c => c.id);
    const { data: fotos } = cpIds.length > 0
      ? await supabase.from("montaje_fotos").select("checkpoint_id").in("checkpoint_id", cpIds)
      : { data: [] };

    const fotoSet = new Set((fotos || []).map(f => f.checkpoint_id));
    const byEvento = new Map<string, { total: number; completados: number }>();
    for (const cp of cps || []) {
      const cur = byEvento.get(cp.evento_id) || { total: 0, completados: 0 };
      cur.total++;
      if (fotoSet.has(cp.id)) cur.completados++;
      byEvento.set(cp.evento_id, cur);
    }

    setEventos(evs.map(e => ({
      ...e,
      coord_nombre: roleMap.get(e.coordinador_id) || "—",
      total: byEvento.get(e.id)?.total ?? 0,
      completados: byEvento.get(e.id)?.completados ?? 0,
    })));
    setLoading(false);
  }

  const filtered = eventos.filter(e =>
    !search || e.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    e.ciudad?.toLowerCase().includes(search.toLowerCase()) ||
    e.coord_nombre?.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = filtered.filter(e => e.fecha >= today);
  const past = filtered.filter(e => e.fecha < today);

  function EventCard({ e }: { e: EventoAdmin }) {
    const pct = e.total > 0 ? Math.round((e.completados / e.total) * 100) : 0;
    const done = e.completados === e.total && e.total > 0;
    const noSetup = e.total === 0;
    const badgeClass = formatoBadgeClass(e.formato);

    return (
      <button
        onClick={() => navigate(`/admin/evento/${e.id}`)}
        className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all active:scale-[0.99]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badgeClass}`}>
              {e.formato}
            </span>
            <p className="font-semibold text-slate-900 text-sm truncate">{e.codigo}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><MapPin size={11} />{e.ciudad}</span>
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {new Date(e.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
            </span>
            <span className="truncate">{e.coord_nombre}</span>
          </div>
          {!noSetup && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400">{e.completados}/{e.total} pasos</span>
                {done && <span className="text-[10px] font-semibold text-green-600 flex items-center gap-0.5"><CheckCircle2 size={10} /> Completo</span>}
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full">
                <div
                  className={`h-1.5 rounded-full transition-all ${done ? "bg-green-500" : "bg-slate-800"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
          {noSetup && <p className="text-[10px] text-slate-300 mt-1">Sin checklist asignado</p>}
        </div>
        <ChevronRight size={15} className="text-slate-300 shrink-0" />
      </button>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-slate-900">Panel de montaje</h1>
        <p className="text-sm text-slate-400 mt-0.5">Estado del montaje por evento</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar evento, ciudad o coordinador…"
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-slate-400 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
        </div>
      ) : (
        <>
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
          {filtered.length === 0 && (
            <div className="text-center py-20 text-slate-400 text-sm">
              {search ? "No hay resultados" : "No hay eventos con coordinador asignado"}
            </div>
          )}
        </>
      )}
    </div>
  );
}
