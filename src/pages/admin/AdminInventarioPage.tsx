import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Download, PenLine, X, Plus, Trash2,
  ChevronRight, Image as ImageIcon, MapPin, SlidersHorizontal, Check,
  CalendarDays, Package, ArrowUpFromLine, ArrowDownToLine,
} from "lucide-react";
import { formatoBadgeClass } from "@/lib/formatoColors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bodega { id: string; nombre: string; activa: boolean; }
interface FotoRow { id: string; bodega_id: string | null; foto_url: string; created_at: string; eventos: { codigo: string; fecha: string; formato: string } | null; }
interface RemRow { bodega_id: string | null; evento_id: string; updated_at: string; cantidad: number | null; estado: string | null; eventos: { codigo: string; fecha: string; formato: string; ciudad: string } | null; }
interface CatalogItem { id: string; numero: number; nombre: string; formato: string; }

const FORMATOS = ["CDL", "TJR", "BOL", "TJE"] as const;
type Formato = (typeof FORMATOS)[number];

const FORMATO_LABEL: Record<string, string> = {
  CDL: "Candlelight", TJR: "The Jazz Room", BOL: "Ballet of Lights", TJE: "The Jury Experience",
};

// ─── CSV helper ───────────────────────────────────────────────────────────────

function toCSV(rows: object[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map(r => cols.map(c => escape((r as any)[c])).join(","))].join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminInventarioPage() {
  const navigate = useNavigate();

  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [fotos, setFotos] = useState<FotoRow[]>([]);
  const [rems, setRems] = useState<RemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Detail view
  const [selectedBodegaId, setSelectedBodegaId] = useState<string | null>(null);
  const [detailEvents, setDetailEvents] = useState<Array<{ id: string; codigo: string; fecha: string; formato: string }>>([]);
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [detailEtapa, setDetailEtapa] = useState<"salida" | "retorno">("salida");
  const [detailFotos, setDetailFotos] = useState<Record<string, string>>({});
  const [detailRems, setDetailRems] = useState<Array<{ nombre: string; numero: number; cantidad: number | null; estado: string | null; novedad: string | null; etapa: string }>>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Download filter sheet
  const [showDownload, setShowDownload] = useState(false);
  const [dlFmts, setDlFmts] = useState<string[]>([]);
  const [dlCiudades, setDlCiudades] = useState<string[]>([]);
  const [dlEtapa, setDlEtapa] = useState<"todas" | "salida" | "retorno">("todas");
  const [dlDesde, setDlDesde] = useState("");
  const [dlHasta, setDlHasta] = useState("");

  // Catalog editor sheet
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogFmt, setCatalogFmt] = useState<Formato>("CDL");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showCatalog) loadCatalog(catalogFmt); }, [showCatalog, catalogFmt]);

  // ── Data loading ─────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    const [{ data: bo }, { data: ft }, { data: rm }] = await Promise.all([
      supabase.from("bodegas").select("id, nombre, activa").eq("activa", true).order("nombre"),
      supabase.from("inventario_evento_fotos")
        .select("id, bodega_id, foto_url, created_at, eventos(codigo, fecha, formato)")
        .order("created_at", { ascending: false }),
      supabase.from("inventario_evento_remisiones")
        .select("bodega_id, evento_id, updated_at, cantidad, estado, eventos(codigo, fecha, formato, ciudad)")
        .eq("etapa", "salida")
        .not("bodega_id", "is", null)
        .order("updated_at", { ascending: false }),
    ]);
    setBodegas((bo || []) as Bodega[]);
    setFotos((ft || []) as unknown as FotoRow[]);
    setRems((rm || []) as unknown as RemRow[]);
    setLoading(false);
  }

  async function loadCatalog(fmt: Formato) {
    setCatalogLoading(true);
    const { data } = await supabase.from("inventario_items").select("id, numero, nombre, formato").eq("formato", fmt).order("orden");
    setCatalogItems(data || []);
    setCatalogLoading(false);
  }

  // ── Catalog CRUD ─────────────────────────────────────────────────────────

  async function addCatalogItem() {
    if (!newItemName.trim()) return;
    setAddingItem(true);
    const maxNum = catalogItems.length > 0 ? Math.max(...catalogItems.map(i => i.numero)) : 0;
    const { data } = await supabase.from("inventario_items").insert({
      formato: catalogFmt, numero: maxNum + 1, nombre: newItemName.trim(), orden: maxNum + 1,
    }).select("id, numero, nombre, formato").single();
    if (data) setCatalogItems(prev => [...prev, data]);
    setNewItemName("");
    setAddingItem(false);
  }

  async function deleteCatalogItem(id: string) {
    await supabase.from("inventario_items").delete().eq("id", id);
    setCatalogItems(prev => prev.filter(i => i.id !== id));
  }

  async function renameCatalogItem(id: string, nombre: string) {
    await supabase.from("inventario_items").update({ nombre }).eq("id", id);
    setCatalogItems(prev => prev.map(i => i.id === id ? { ...i, nombre } : i));
  }

  // ── Download ──────────────────────────────────────────────────────────────

  function toggleArr(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  async function handleDownload() {
    setDownloading(true);
    const { data: allRems } = await supabase
      .from("inventario_evento_remisiones")
      .select("etapa, cantidad, estado, novedad, updated_at, eventos(codigo, fecha, formato, ciudad), inventario_items(nombre, numero), bodegas(nombre), inventario_venues(nombre)");

    let filtered = allRems || [];
    if (dlEtapa !== "todas") filtered = filtered.filter((r: any) => r.etapa === dlEtapa);
    if (dlFmts.length > 0) filtered = filtered.filter((r: any) => dlFmts.includes(r.eventos?.formato));
    if (dlCiudades.length > 0) filtered = filtered.filter((r: any) => dlCiudades.includes(r.eventos?.ciudad));
    if (dlDesde) filtered = filtered.filter((r: any) => r.eventos?.fecha >= dlDesde);
    if (dlHasta) filtered = filtered.filter((r: any) => r.eventos?.fecha <= dlHasta);

    const rows = filtered.map((r: any) => ({
      "Evento": r.eventos?.codigo ?? "",
      "Fecha": r.eventos?.fecha ?? "",
      "Formato": r.eventos?.formato ?? "",
      "Ciudad": r.eventos?.ciudad ?? "",
      "Nº Item": r.inventario_items?.numero ?? "",
      "Item": r.inventario_items?.nombre ?? "",
      "Etapa": r.etapa ?? "",
      "Cantidad": r.cantidad ?? "",
      "Estado": r.estado ?? "",
      "Bodega": r.bodegas?.nombre ?? "",
      "Venue": r.inventario_venues?.nombre ?? "",
      "Novedad": r.novedad ?? "",
      "Actualizado": r.updated_at?.slice(0, 16).replace("T", " ") ?? "",
    }));

    const suffix = [
      dlEtapa !== "todas" ? dlEtapa : "",
      dlFmts.length ? dlFmts.join("-") : "",
      dlCiudades.length ? dlCiudades.join("-") : "",
      dlDesde || dlHasta ? `${dlDesde || ""}a${dlHasta || ""}` : "",
    ].filter(Boolean).join("_");

    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(toCSV(rows), `inventario${suffix ? "-" + suffix : ""}-${date}.csv`);
    setDownloading(false);
    setShowDownload(false);
  }

  // ── Detail view ──────────────────────────────────────────────────────────

  async function loadDetail(bodegaId: string, eventId?: string) {
    setDetailLoading(true);

    const { data: remRows } = await supabase
      .from("inventario_evento_remisiones")
      .select("evento_id, eventos(id, codigo, fecha, formato)")
      .eq("bodega_id", bodegaId)
      .order("updated_at", { ascending: false });

    const seen = new Set<string>();
    const events: Array<{ id: string; codigo: string; fecha: string; formato: string }> = [];
    for (const r of (remRows || []) as any[]) {
      const ev = r.eventos;
      if (ev && !seen.has(ev.id)) { seen.add(ev.id); events.push(ev); }
    }
    events.sort((a, b) => b.fecha.localeCompare(a.fecha));
    setDetailEvents(events);

    const targetId = eventId || events[0]?.id;
    if (!targetId) { setDetailLoading(false); return; }
    setDetailEventId(targetId);

    const [{ data: fotoRows }, { data: remDetail }] = await Promise.all([
      supabase.from("inventario_evento_fotos")
        .select("foto_url, etapa").eq("bodega_id", bodegaId).eq("evento_id", targetId)
        .order("created_at", { ascending: false }),
      supabase.from("inventario_evento_remisiones")
        .select("etapa, cantidad, estado, novedad, inventario_items(nombre, numero)")
        .eq("bodega_id", bodegaId).eq("evento_id", targetId),
    ]);

    const fotoMap: Record<string, string> = {};
    for (const f of fotoRows || []) { if (!fotoMap[(f as any).etapa]) fotoMap[(f as any).etapa] = (f as any).foto_url; }
    setDetailFotos(fotoMap);
    setDetailRems(((remDetail || []) as any[]).map(r => ({
      nombre: r.inventario_items?.nombre ?? "",
      numero: r.inventario_items?.numero ?? 0,
      cantidad: r.cantidad,
      estado: r.estado,
      novedad: r.novedad,
      etapa: r.etapa,
    })).sort((a, b) => a.numero - b.numero));
    setDetailLoading(false);
  }

  function openDetail(bodegaId: string) {
    setSelectedBodegaId(bodegaId);
    setDetailEvents([]); setDetailEventId(null);
    setDetailEtapa("salida"); setDetailFotos({}); setDetailRems([]);
    loadDetail(bodegaId);
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const { bodegaStats, bodegaCityMap, cities } = useMemo(() => {
    const stats: Record<string, {
      foto?: FotoRow;
      latestEvento?: { codigo: string; fecha: string; formato: string; ciudad: string };
      eventoId?: string;
      itemsCount: number;
      itemsFilled: number;
    }> = {};

    // Derive city per bodega from most recent rem
    const cityByBodega: Record<string, string> = {};

    for (const b of bodegas) {
      const bFotos = fotos.filter(f => f.bodega_id === b.id);
      const bRems = rems.filter(r => r.bodega_id === b.id);
      const latestRem = bRems[0];
      const eventoId = latestRem?.evento_id;
      const eventoRems = eventoId ? bRems.filter(r => r.evento_id === eventoId) : [];
      const filled = eventoRems.filter(r => r.cantidad !== null && r.estado !== null).length;
      stats[b.id] = {
        foto: bFotos[0],
        latestEvento: latestRem?.eventos as any,
        eventoId,
        itemsCount: eventoRems.length,
        itemsFilled: filled,
      };
      const ciudad = (latestRem?.eventos as any)?.ciudad;
      if (ciudad) cityByBodega[b.id] = ciudad;
    }
    const allCities = [...new Set(Object.values(cityByBodega))].sort();
    return { bodegaStats: stats, bodegaCityMap: cityByBodega, cities: allCities };
  }, [bodegas, fotos, rems]);

  const citiesWithBodegas = useMemo(() => {
    return cities.map(city => ({
      city,
      bodegas: bodegas
        .filter(b => bodegaCityMap[b.id] === city)
        .sort((a, b) => {
          const sa = bodegaStats[a.id]; const sb = bodegaStats[b.id];
          const pa = sa?.itemsCount ? sa.itemsFilled / sa.itemsCount : 0;
          const pb = sb?.itemsCount ? sb.itemsFilled / sb.itemsCount : 0;
          return pb - pa;
        }),
    }));
  }, [cities, bodegas, bodegaCityMap, bodegaStats]);

  // Bodegas with no city mapping
  const uncategorizedBodegas = useMemo(() =>
    bodegas.filter(b => !bodegaCityMap[b.id]),
    [bodegas, bodegaCityMap]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: "hsl(220 13% 95%)" }}>
        <div className="flex items-center gap-2 px-4 pt-5 pb-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/60 shrink-0 -ml-1 transition-colors">
            <ArrowLeft size={20} style={{ color: "hsl(220 9% 46%)" }} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-0" style={{ color: "hsl(24 95% 53%)" }}>Admin</p>
            <p className="font-bold text-base" style={{ color: "hsl(222 47% 11%)" }}>Inventario · Bodegas</p>
          </div>
          <button
            onClick={() => setShowCatalog(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors focus:outline-none"
            style={{ background: "white", color: "hsl(220 9% 46%)", border: "1px solid hsl(220 13% 91%)" }}
          >
            <PenLine size={13} /> Formularios
          </button>
          <button
            onClick={() => setShowDownload(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors focus:outline-none"
            style={{ background: "hsl(222 47% 11%)", color: "white" }}
          >
            <SlidersHorizontal size={13} /> Exportar
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-4 pt-4 space-y-4">
          {[1, 2].map(i => (
            <div key={i}>
              <div className="h-4 w-24 rounded skeleton mb-2" />
              {[1, 2, 3].map(j => <div key={j} className="h-14 rounded-2xl skeleton mb-2" />)}
            </div>
          ))}
        </div>
      ) : bodegas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
          <ImageIcon size={40} style={{ color: "hsl(220 13% 88%)" }} className="mb-3" />
          <p className="font-medium" style={{ color: "hsl(220 9% 46%)" }}>Sin bodegas configuradas</p>
          <p className="text-xs mt-1" style={{ color: "hsl(218 11% 65%)" }}>Contacta al administrador del sistema</p>
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-5">
          {citiesWithBodegas.map(({ city, bodegas: cityBodegas }) => (
            <div key={city}>
              {/* City header */}
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={12} style={{ color: "hsl(24 95% 53%)" }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "hsl(24 95% 53%)" }}>{city}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(220 13% 91%)", color: "hsl(220 9% 46%)" }}>
                  {cityBodegas.length}
                </span>
              </div>

              {/* Compact rows */}
              <div className="space-y-2">
                {cityBodegas.map(bodega => {
                  const st = bodegaStats[bodega.id] ?? { itemsCount: 0, itemsFilled: 0 };
                  const pct = st.itemsCount > 0 ? Math.round((st.itemsFilled / st.itemsCount) * 100) : -1;
                  return (
                    <button
                      key={bodega.id}
                      onClick={() => openDetail(bodega.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all focus:outline-none"
                      style={{ background: "white", border: "1px solid hsl(220 13% 91%)", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}
                    >
                      {/* Status dot */}
                      <div className="w-2 h-2 rounded-full shrink-0" style={{
                        background: pct === -1 ? "hsl(220 13% 88%)" : pct === 100 ? "#10b981" : "hsl(24 95% 53%)"
                      }} />

                      {/* Name */}
                      <span className="flex-1 font-semibold text-sm truncate" style={{ color: "hsl(222 47% 11%)" }}>
                        {bodega.nombre}
                      </span>

                      {/* Stats */}
                      {pct >= 0 ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220 13% 91%)" }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : "hsl(24 95% 53%)" }} />
                          </div>
                          <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color: pct === 100 ? "#059669" : "hsl(220 9% 46%)" }}>
                            {pct}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px]" style={{ color: "hsl(218 11% 65%)" }}>Sin datos</span>
                      )}

                      <ChevronRight size={14} style={{ color: "hsl(218 11% 65%)" }} className="shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Uncategorized */}
          {uncategorizedBodegas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package size={12} style={{ color: "hsl(218 11% 65%)" }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "hsl(218 11% 65%)" }}>Sin ciudad</span>
              </div>
              <div className="space-y-2">
                {uncategorizedBodegas.map(bodega => (
                  <button
                    key={bodega.id}
                    onClick={() => openDetail(bodega.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all focus:outline-none"
                    style={{ background: "white", border: "1px solid hsl(220 13% 91%)" }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "hsl(220 13% 88%)" }} />
                    <span className="flex-1 font-semibold text-sm" style={{ color: "hsl(222 47% 11%)" }}>{bodega.nombre}</span>
                    <ChevronRight size={14} style={{ color: "hsl(218 11% 65%)" }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail overlay ───────────────────────────────────────────────────── */}
      {selectedBodegaId && (() => {
        const bodega = bodegas.find(b => b.id === selectedBodegaId);
        const etapaRems = detailRems.filter(r => r.etapa === detailEtapa);
        const fotoUrl = detailFotos[detailEtapa];
        return (
          <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "hsl(220 13% 95%)" }}>
            {/* Header */}
            <div className="sticky top-0 z-10" style={{ background: "hsl(220 13% 95%)" }}>
              <div className="flex items-center gap-2 px-4 pt-5 pb-3">
                <button
                  onClick={() => setSelectedBodegaId(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/60 shrink-0 -ml-1 transition-colors"
                >
                  <ArrowLeft size={20} style={{ color: "hsl(220 9% 46%)" }} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest mb-0" style={{ color: "hsl(24 95% 53%)" }}>
                    {bodegaCityMap[selectedBodegaId] || "Bodega"}
                  </p>
                  <p className="font-bold text-base truncate" style={{ color: "hsl(222 47% 11%)" }}>{bodega?.nombre}</p>
                </div>
              </div>

              {/* Event chips */}
              {detailEvents.length > 0 && (
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
                  {detailEvents.map(ev => {
                    const isActive = ev.id === detailEventId;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => { setDetailEventId(ev.id); loadDetail(selectedBodegaId, ev.id); }}
                        className="shrink-0 flex flex-col items-start px-3 py-2 rounded-2xl text-xs transition-all focus:outline-none"
                        style={isActive
                          ? { background: "hsl(222 47% 11%)", color: "white" }
                          : { background: "white", color: "hsl(220 9% 46%)", border: "1px solid hsl(220 13% 91%)" }
                        }
                      >
                        <span className="font-mono font-bold text-[10px]">{ev.codigo}</span>
                        <span className="text-[9px] mt-0.5 opacity-70">{ev.fecha}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Etapa tabs */}
              <div className="flex gap-2 px-4 pb-3">
                {(["salida", "retorno"] as const).map(etapa => (
                  <button
                    key={etapa}
                    onClick={() => setDetailEtapa(etapa)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none"
                    style={detailEtapa === etapa
                      ? { background: "hsl(24 95% 53%)", color: "white" }
                      : { background: "white", color: "hsl(220 9% 46%)", border: "1px solid hsl(220 13% 91%)" }
                    }
                  >
                    {etapa === "salida" ? <ArrowUpFromLine size={12} /> : <ArrowDownToLine size={12} />}
                    {etapa.charAt(0).toUpperCase() + etapa.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "hsl(220 13% 88%)", borderTopColor: "hsl(222 47% 11%)" }} />
                </div>
              ) : detailEvents.length === 0 ? (
                <div className="text-center py-20">
                  <Package size={36} style={{ color: "hsl(220 13% 88%)" }} className="mx-auto mb-3" />
                  <p className="font-medium text-sm" style={{ color: "hsl(220 9% 46%)" }}>Sin registros en esta bodega</p>
                </div>
              ) : (
                <>
                  {/* Photo */}
                  <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid hsl(220 13% 91%)" }}>
                    {fotoUrl ? (
                      <img src={fotoUrl} alt="Foto bodega" className="w-full object-cover" style={{ maxHeight: 260 }} />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-12" style={{ background: "hsl(220 13% 97%)" }}>
                        <ImageIcon size={32} style={{ color: "hsl(220 13% 83%)" }} />
                        <p className="text-xs" style={{ color: "hsl(218 11% 65%)" }}>Sin foto de {detailEtapa}</p>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  {etapaRems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: "hsl(218 11% 65%)" }}>
                        Items · {etapaRems.length}
                      </p>
                      {etapaRems.map((rem, i) => {
                        const estadoColor = rem.estado === "correcto" ? "#10b981"
                          : rem.estado === "incompleto" ? "hsl(24 95% 53%)"
                          : rem.estado === "dañado" || rem.estado === "falta" ? "#ef4444"
                          : "hsl(218 11% 65%)";
                        return (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                            style={{ background: "white", border: "1px solid hsl(220 13% 91%)" }}>
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: "hsl(220 13% 91%)", color: "hsl(220 9% 46%)" }}>
                              {rem.numero}
                            </span>
                            <span className="flex-1 text-sm font-medium truncate" style={{ color: "hsl(222 47% 11%)" }}>
                              {rem.nombre}
                            </span>
                            {rem.cantidad !== null && (
                              <span className="text-[11px] font-bold tabular-nums" style={{ color: "hsl(220 9% 46%)" }}>
                                ×{rem.cantidad}
                              </span>
                            )}
                            {rem.estado && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: estadoColor + "18", color: estadoColor }}>
                                {rem.estado}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {etapaRems.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-sm" style={{ color: "hsl(218 11% 65%)" }}>Sin items registrados en {detailEtapa}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Bottom sheet: exportar con filtros ──────────────────────────────── */}
      {showDownload && (
        <div className="fixed inset-0 z-50 flex flex-col" onClick={() => setShowDownload(false)}>
          <div className="flex-1" style={{ background: "rgba(10,12,20,0.6)", backdropFilter: "blur(4px)" }} />
          <div
            className="rounded-t-3xl flex flex-col"
            style={{ background: "white", maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "hsl(220 13% 88%)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-2 pb-4" style={{ borderBottom: "1px solid hsl(220 13% 93%)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(222 47% 11%)" }}>
                <Download size={15} color="white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: "hsl(222 47% 11%)" }}>Exportar inventario</p>
                <p className="text-xs mt-0.5" style={{ color: "hsl(218 11% 65%)" }}>Aplica filtros y descarga el CSV</p>
              </div>
              <button onClick={() => setShowDownload(false)} className="w-8 h-8 flex items-center justify-center rounded-full transition-colors" style={{ color: "hsl(218 11% 65%)" }}>
                <X size={17} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Etapa */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "hsl(218 11% 65%)" }}>Etapa</p>
                <div className="flex gap-2">
                  {([
                    { key: "todas", label: "Todas", icon: Package },
                    { key: "salida", label: "Salida", icon: ArrowUpFromLine },
                    { key: "retorno", label: "Retorno", icon: ArrowDownToLine },
                  ] as const).map(opt => {
                    const isActive = dlEtapa === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setDlEtapa(opt.key)}
                        className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold transition-all focus:outline-none"
                        style={isActive
                          ? { background: "hsl(222 47% 11%)", color: "white" }
                          : { background: "hsl(220 13% 95%)", color: "hsl(220 9% 46%)" }
                        }
                      >
                        <opt.icon size={16} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formato */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "hsl(218 11% 65%)" }}>Experiencia / Formato</p>
                <div className="flex flex-wrap gap-2">
                  {FORMATOS.map(f => {
                    const isActive = dlFmts.includes(f);
                    return (
                      <button
                        key={f}
                        onClick={() => setDlFmts(prev => toggleArr(prev, f))}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all focus:outline-none"
                        style={isActive
                          ? { background: "hsl(24 95% 53%)", color: "white" }
                          : { background: "hsl(220 13% 95%)", color: "hsl(220 9% 46%)" }
                        }
                      >
                        {isActive && <Check size={11} />}
                        {f}
                        <span className="text-[9px] opacity-70 font-normal ml-0.5">{FORMATO_LABEL[f]}</span>
                      </button>
                    );
                  })}
                </div>
                {dlFmts.length === 0 && (
                  <p className="text-[10px] mt-1.5" style={{ color: "hsl(218 11% 65%)" }}>Sin selección = todos los formatos</p>
                )}
              </div>

              {/* Ciudad */}
              {cities.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "hsl(218 11% 65%)" }}>Ciudad</p>
                  <div className="flex flex-wrap gap-2">
                    {cities.map(city => {
                      const isActive = dlCiudades.includes(city);
                      return (
                        <button
                          key={city}
                          onClick={() => setDlCiudades(prev => toggleArr(prev, city))}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold transition-all focus:outline-none"
                          style={isActive
                            ? { background: "hsl(24 95% 53%)", color: "white" }
                            : { background: "hsl(220 13% 95%)", color: "hsl(220 9% 46%)" }
                          }
                        >
                          {isActive && <Check size={11} />}
                          <MapPin size={11} />
                          {city}
                        </button>
                      );
                    })}
                  </div>
                  {dlCiudades.length === 0 && (
                    <p className="text-[10px] mt-1.5" style={{ color: "hsl(218 11% 65%)" }}>Sin selección = todas las ciudades</p>
                  )}
                </div>
              )}

              {/* Rango de fechas */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "hsl(218 11% 65%)" }}>Rango de fechas del evento</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold" style={{ color: "hsl(218 11% 65%)" }}>Desde</label>
                    <div className="relative">
                      <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(218 11% 65%)" }} />
                      <input
                        type="date"
                        value={dlDesde}
                        onChange={e => setDlDesde(e.target.value)}
                        className="w-full rounded-xl pl-8 pr-3 py-2.5 text-xs focus:outline-none"
                        style={{ border: "1.5px solid hsl(220 13% 88%)", background: dlDesde ? "hsl(220 13% 97%)" : "white", color: "hsl(222 47% 11%)" }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold" style={{ color: "hsl(218 11% 65%)" }}>Hasta</label>
                    <div className="relative">
                      <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(218 11% 65%)" }} />
                      <input
                        type="date"
                        value={dlHasta}
                        onChange={e => setDlHasta(e.target.value)}
                        className="w-full rounded-xl pl-8 pr-3 py-2.5 text-xs focus:outline-none"
                        style={{ border: "1.5px solid hsl(220 13% 88%)", background: dlHasta ? "hsl(220 13% 97%)" : "white", color: "hsl(222 47% 11%)" }}
                      />
                    </div>
                  </div>
                </div>
                {(dlDesde || dlHasta) && (
                  <button onClick={() => { setDlDesde(""); setDlHasta(""); }} className="text-[10px] mt-1.5 underline" style={{ color: "hsl(218 11% 65%)" }}>
                    Limpiar fechas
                  </button>
                )}
              </div>

              {/* Resumen de filtros activos */}
              {(dlFmts.length > 0 || dlCiudades.length > 0 || dlEtapa !== "todas" || dlDesde || dlHasta) && (
                <div className="rounded-2xl p-3.5 flex items-center gap-2.5" style={{ background: "hsl(220 13% 96%)", border: "1px solid hsl(220 13% 91%)" }}>
                  <SlidersHorizontal size={13} style={{ color: "hsl(24 95% 53%)" }} className="shrink-0" />
                  <p className="text-xs" style={{ color: "hsl(220 9% 46%)" }}>
                    Filtros activos:{" "}
                    <span className="font-semibold" style={{ color: "hsl(222 47% 11%)" }}>
                      {[
                        dlEtapa !== "todas" && dlEtapa,
                        dlFmts.length && dlFmts.join(", "),
                        dlCiudades.length && dlCiudades.join(", "),
                        dlDesde && `desde ${dlDesde}`,
                        dlHasta && `hasta ${dlHasta}`,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </p>
                  <button
                    onClick={() => { setDlFmts([]); setDlCiudades([]); setDlEtapa("todas"); setDlDesde(""); setDlHasta(""); }}
                    className="ml-auto shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-xl"
                    style={{ background: "hsl(220 13% 88%)", color: "hsl(220 9% 46%)" }}
                  >
                    Limpiar todo
                  </button>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="px-5 pt-3 pb-6" style={{ borderTop: "1px solid hsl(220 13% 93%)" }}>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 focus:outline-none"
                style={{ background: "hsl(222 47% 11%)" }}
              >
                {downloading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Download size={16} />
                }
                {downloading ? "Generando CSV…" : "Descargar CSV"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom sheet: catalog editor ────────────────────────────────────── */}
      {showCatalog && (
        <div className="fixed inset-0 z-50 flex flex-col" onClick={() => setShowCatalog(false)}>
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" />

          {/* Sheet */}
          <div
            className="bg-white rounded-t-3xl flex flex-col"
            style={{ maxHeight: "88vh" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-slate-100">
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Editar formularios</p>
                <p className="text-xs text-slate-400 mt-0.5">Items de inventario por experiencia</p>
              </div>
              <button onClick={() => setShowCatalog(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Format tabs */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-slate-100 shrink-0">
              {FORMATOS.map(f => (
                <button
                  key={f}
                  onClick={() => setCatalogFmt(f)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    catalogFmt === f ? formatoBadgeClass(f) : "bg-white text-slate-400 border-slate-200"
                  }`}
                >
                  {f}
                  <span className="ml-1 font-normal opacity-70 hidden sm:inline">· {FORMATO_LABEL[f]}</span>
                </button>
              ))}
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {catalogLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {catalogItems.map(item => (
                    <CatalogItemRow key={item.id} item={item} onRename={renameCatalogItem} onDelete={deleteCatalogItem} />
                  ))}
                  {catalogItems.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-8">Sin items para {catalogFmt}</p>
                  )}
                </>
              )}
            </div>

            {/* Add item */}
            <div className="px-4 pb-6 pt-3 border-t border-slate-100 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre del item…"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addCatalogItem(); }}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400"
                />
                <button
                  onClick={addCatalogItem}
                  disabled={addingItem || !newItemName.trim()}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CatalogItemRow ───────────────────────────────────────────────────────────

function CatalogItemRow({ item, onRename, onDelete }: {
  item: CatalogItem;
  onRename: (id: string, nombre: string) => void;
  onDelete: (id: string) => void;
}) {
  const [val, setVal] = useState(item.nombre);

  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
      <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
        {item.numero}
      </span>
      <input
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => val.trim() && val !== item.nombre && onRename(item.id, val.trim())}
        className="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none min-w-0"
      />
      <button
        onClick={() => { if (confirm(`¿Eliminar "${item.nombre}"?`)) onDelete(item.id); }}
        className="text-slate-300 hover:text-red-400 transition-colors p-1 shrink-0"
      >
        <Trash2 size={14} />
      </button>
      <ChevronRight size={14} className="text-slate-200 shrink-0" />
    </div>
  );
}
