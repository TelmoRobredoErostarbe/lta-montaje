import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { MapPin, ChevronRight, Settings } from "lucide-react";

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

  function EventRow({ e }: { e: EventoAdmin }) {
    const pct = e.total > 0 ? Math.round((e.completados / e.total) * 100) : 0;
    const done = e.completados === e.total && e.total > 0;
    const noSetup = e.total === 0;
    return (
      <button
        onClick={() => navigate(`/admin/evento/${e.id}`)}
        className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${done ? "bg-green-500" : noSetup ? "bg-gray-200 text-gray-400" : "bg-blue-600"}`}>
          {done ? "✓" : noSetup ? "–" : `${pct}%`}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900 truncate">{e.codigo || e.id.slice(0, 8)}</p>
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 shrink-0">{e.formato}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span className="flex items-center gap-1"><MapPin size={10} />{e.ciudad}</span>
            <span>{e.fecha.slice(8, 10)}/{e.fecha.slice(5, 7)}</span>
            <span className="truncate">{e.coord_nombre}</span>
          </div>
          {!noSetup && (
            <div className="mt-1.5 w-full h-1 bg-gray-100 rounded-full">
              <div className={`h-1 rounded-full ${done ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <ChevronRight size={14} className="text-gray-300 shrink-0" />
      </button>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Montaje · Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">Progreso por evento</p>
        </div>
        <button
          onClick={() => navigate("/admin/plantillas")}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-colors"
        >
          <Settings size={13} /> Plantillas
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar evento, ciudad o coordinador…"
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-blue-400"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => <EventRow key={e.id} e={e} />)}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              {search ? "No hay resultados" : "No hay eventos con coordinador asignado"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
