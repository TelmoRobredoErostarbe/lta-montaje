import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { MapPin, CalendarDays, CheckCircle2, Search, Bell, ChevronRight, Layers, Activity, CalendarClock, History, PlayCircle } from "lucide-react";
import { FORMATO_COLOR } from "@/lib/formatoColors";
import { detectExperiencia } from "@/lib/plantillaTemplates";

interface EventoAdmin {
  id: string;
  codigo: string;
  ciudad: string;
  fecha: string;
  hora_inicio_show: string | null;
  formato: string;
  coord_nombre: string;
  total: number;
  completados: number;
}

const FORMATO_DOT: Record<string, string> = {
  CDL: "#f97316", BOL: "#3b82f6", TJE: "#7c3aed", TJR: "#10b981", IGW: "#8b5cf6",
};

function pct(c: number, t: number) { return t > 0 ? Math.round((c / t) * 100) : 0; }

type EventStatus = "done" | "active" | "upcoming" | "finalizado" | "no-setup";

function statusOf(e: EventoAdmin, today: string): EventStatus {
  if (e.fecha < today) {
    if (e.total > 0 && e.completados === e.total) return "done";
    return "finalizado";
  }
  if (e.total === 0) return "no-setup";
  if (e.completados === e.total) return "done";
  if (e.fecha === today) return "active";
  return "upcoming";
}

const STATUS_META: Record<EventStatus, { label: string; barColor: string; pillBg: string; pillText: string }> = {
  done:       { label: "Completo",   barColor: "#10b981", pillBg: "#d1fae5",   pillText: "#065f46"  },
  active:     { label: "En curso",   barColor: "#3b82f6", pillBg: "#dbeafe",   pillText: "#1e40af"  },
  upcoming:   { label: "Próximo",    barColor: "hsl(218 11% 65%)", pillBg: "hsl(220 13% 91%)", pillText: "hsl(220 9% 46%)" },
  finalizado: { label: "Finalizado", barColor: "hsl(218 11% 65%)", pillBg: "hsl(220 13% 95%)", pillText: "hsl(220 9% 46%)" },
  "no-setup": { label: "Pendiente",  barColor: "hsl(220 13% 88%)", pillBg: "hsl(220 13% 95%)", pillText: "hsl(218 11% 65%)" },
};

function plantillaNombre(formato: string, codigo: string): string {
  const up = formato?.toUpperCase();
  if (up === "CDL") {
    const { cdlVariant } = detectExperiencia(codigo);
    return `CDL ${cdlVariant}`;
  }
  const NOMBRES: Record<string, string> = {
    TJR: "The Jazz Room", TJE: "The Jury Experience", BOL: "Ballet of Lights", IGW: "IGW",
  };
  return NOMBRES[up] ?? up;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"todos" | "programados" | "en-curso" | "historico">("todos");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: evs } = await supabase
      .from("eventos")
      .select("id, codigo, ciudad, fecha, formato, coordinador_id, hora_inicio_show")
      .not("coordinador_id", "is", null)
      .order("fecha", { ascending: false })
      .limit(100);

    if (!evs || evs.length === 0) { setLoading(false); return; }

    const coordIds = [...new Set(evs.map((e: any) => e.coordinador_id).filter(Boolean))];
    const { data: roles } = await supabase.from("user_roles").select("user_id, nombre").in("user_id", coordIds);
    const roleMap = new Map((roles || []).map(r => [r.user_id, r.nombre]));

    const eventoIds = evs.map((e: any) => e.id);
    const { data: cps } = await supabase.from("montaje_checkpoints").select("id, evento_id").in("evento_id", eventoIds);
    const cpIds = (cps || []).map((c: any) => c.id);
    const { data: fotos } = cpIds.length > 0
      ? await supabase.from("montaje_fotos").select("checkpoint_id").in("checkpoint_id", cpIds)
      : { data: [] };

    const fotoSet = new Set((fotos || []).map((f: any) => f.checkpoint_id));
    const byEvento = new Map<string, { total: number; completados: number }>();
    for (const cp of cps || []) {
      const cur = byEvento.get((cp as any).evento_id) || { total: 0, completados: 0 };
      cur.total++;
      if (fotoSet.has((cp as any).id)) cur.completados++;
      byEvento.set((cp as any).evento_id, cur);
    }

    setEventos(evs.map((e: any) => ({
      ...e,
      coord_nombre: roleMap.get(e.coordinador_id) || "—",
      total: byEvento.get(e.id)?.total ?? 0,
      completados: byEvento.get(e.id)?.completados ?? 0,
    })));
    setLoading(false);
  }

  async function sendTestPush() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("Sin sesión"); return; }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
        { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` }, body: JSON.stringify({ title: "LTA Montaje", body: "Prueba de notificación push." }) }
      );
      const data = await res.json();
      if (!res.ok) alert(`Error ${res.status}: ${JSON.stringify(data)}`);
      else alert(`Enviado a ${data.sent ?? 0} dispositivo(s)`);
    } catch (e) { alert("Error de red: " + String(e)); }
  }

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => eventos.filter(e =>
    !search ||
    e.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    e.ciudad?.toLowerCase().includes(search.toLowerCase()) ||
    e.coord_nombre?.toLowerCase().includes(search.toLowerCase())
  ), [eventos, search]);

  const tabCounts = useMemo(() => ({
    todos: filtered.length,
    programados: filtered.filter(e => e.fecha > today).length,
    "en-curso": filtered.filter(e => e.fecha === today).length,
    historico: filtered.filter(e => e.fecha < today).length,
  }), [filtered, today]);

  const tabFiltered = useMemo(() => {
    switch (tab) {
      case "programados": return filtered.filter(e => e.fecha > today);
      case "en-curso": return filtered.filter(e => e.fecha === today);
      case "historico": return filtered.filter(e => e.fecha < today);
      default: return filtered;
    }
  }, [filtered, tab, today]);

  const total = filtered.length;
  const done = filtered.filter(e => statusOf(e, today) === "done").length;
  const active = filtered.filter(e => statusOf(e, today) === "active").length;

  function EventCard({ e }: { e: EventoAdmin }) {
    const p = pct(e.completados, e.total);
    const st = statusOf(e, today);
    const meta = STATUS_META[st];
    const dotColor = FORMATO_DOT[e.formato?.toUpperCase()] ?? "hsl(218 11% 65%)";
    const fc = FORMATO_COLOR[e.formato?.toUpperCase()] ?? { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" };

    return (
      <button
        onClick={() => navigate(`/admin/evento/${e.id}`)}
        className="w-full text-left card-crm card-crm-hover overflow-hidden focus:outline-none"
      >
        {st === "done" && <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />}
        {st === "active" && <div className="h-0.5" style={{ background: "hsl(217 91% 60%)" }} />}

        <div className="p-4 flex items-center gap-3.5">
          {/* Progress ring */}
          {e.total > 0 ? (
            <div className="shrink-0 relative w-12 h-12">
              <svg width="48" height="48" className="-rotate-90">
                <circle cx="24" cy="24" r="19" fill="none" stroke="hsl(220 13% 91%)" strokeWidth="3" />
                <circle cx="24" cy="24" r="19" fill="none"
                  stroke={p === 100 ? "#10b981" : p > 50 ? "#3b82f6" : "hsl(218 11% 65%)"}
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={2 * Math.PI * 19 * (1 - p / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums" style={{ color: "hsl(222 47% 11%)" }}>{p}%</span>
            </div>
          ) : (
            <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsl(220 13% 95%)", border: "1px solid hsl(220 13% 91%)" }}>
              <Layers size={14} style={{ color: "hsl(218 11% 65%)" }} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${fc.bg} ${fc.text} ${fc.border}`}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                {e.total === 0 ? plantillaNombre(e.formato, e.codigo) : e.formato}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: meta.pillBg, color: meta.pillText }}>
                {meta.label}
              </span>
            </div>
            <p className="font-semibold text-sm truncate" style={{ color: "hsl(222 47% 11%)" }}>{e.codigo}</p>
            <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap" style={{ color: "hsl(218 11% 65%)" }}>
              <span className="flex items-center gap-0.5"><MapPin size={10} />{e.ciudad}</span>
              <span className="flex items-center gap-0.5">
                <CalendarDays size={10} />
                {new Date(e.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
              </span>
              {e.hora_inicio_show && (
                <span className="font-medium" style={{ color: "hsl(220 9% 46%)" }}>Show {e.hora_inicio_show.slice(0, 5)}</span>
              )}
            </div>
            {e.total > 0 && (
              <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220 13% 91%)" }}>
                <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${p}%`, background: meta.barColor }} />
              </div>
            )}
          </div>

          <ChevronRight size={14} style={{ color: "hsl(218 11% 65%)" }} className="shrink-0" />
        </div>
      </button>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 animate-fade-in">

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "hsl(24 95% 53%)" }}>Operaciones</p>
          <h1 className="text-xl font-bold" style={{ color: "hsl(222 47% 11%)" }}>Panel de montaje</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(220 9% 46%)" }}>Estado en tiempo real</p>
        </div>
        <button
          onClick={sendTestPush}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors shrink-0 focus:outline-none"
          style={{ background: "hsl(220 13% 95%)", color: "hsl(220 9% 46%)", border: "1px solid hsl(220 13% 91%)" }}
        >
          <Bell size={12} /> Push test
        </button>
      </div>

      {/* Stats pills */}
      {!loading && total > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 card-crm">
            <span className="text-sm font-bold tabular-nums" style={{ color: "hsl(222 47% 11%)" }}>{total}</span>
            <span className="text-xs" style={{ color: "hsl(220 9% 46%)" }}>eventos</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ background: "#f0fdf4", border: "1px solid #d1fae5" }}>
            <CheckCircle2 size={12} color="#10b981" />
            <span className="text-sm font-bold tabular-nums" style={{ color: "#065f46" }}>{done}</span>
            <span className="text-xs" style={{ color: "#059669" }}>completos</span>
          </div>
          {active > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ background: "#dbeafe", border: "1px solid #bfdbfe" }}>
              <Activity size={12} color="#3b82f6" />
              <span className="text-sm font-bold tabular-nums" style={{ color: "#1e40af" }}>{active}</span>
              <span className="text-xs" style={{ color: "#1d4ed8" }}>en curso</span>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "hsl(218 11% 65%)" }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar evento, ciudad o coordinador…"
          className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none card-crm"
          style={{ color: "hsl(222 47% 11%)" }}
        />
      </div>

      {/* Tabs */}
      {!loading && total > 0 && (
        <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: "hsl(220 13% 93%)" }}>
          {([
            { key: "todos",       label: "Todos",      icon: Layers },
            { key: "programados", label: "Programados", icon: CalendarClock },
            { key: "en-curso",    label: "En Curso",    icon: PlayCircle },
            { key: "historico",   label: "Histórico",   icon: History },
          ] as const).map(t => {
            const isActive = tab === t.key;
            const count = tabCounts[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-semibold transition-all focus:outline-none"
                style={isActive
                  ? { background: "white", color: "hsl(222 47% 11%)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                  : { color: "hsl(218 11% 65%)" }
                }
              >
                <t.icon size={14} />
                <span>{t.label}</span>
                {count > 0 && (
                  <span className="text-[9px] tabular-nums" style={{ color: isActive ? "hsl(24 95% 53%)" : "hsl(218 11% 65%)" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
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
      ) : (
        <>
          {tabFiltered.length > 0 && (
            <div className="space-y-2">
              {tabFiltered.map(e => <EventCard key={e.id} e={e} />)}
            </div>
          )}
          {tabFiltered.length === 0 && (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(220 13% 95%)" }}>
                <Layers size={24} style={{ color: "hsl(218 11% 65%)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "hsl(220 9% 46%)" }}>
                {search ? "Sin resultados" : tab === "todos" ? "No hay eventos con coordinador asignado" : `Sin eventos en esta categoría`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
