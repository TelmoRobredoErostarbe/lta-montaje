import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Trash2, Clock, ChevronDown, ChevronUp, X,
  Camera, Type, Hash, List, CheckSquare, GripVertical,
  PackageOpen, PackageCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatoBadgeClass } from "@/lib/formatoColors";

type TipoBloque = "foto" | "texto" | "numero" | "select" | "checkbox" | "formulario_salida" | "formulario_retorno";

type ReferenciaShow = "inicio" | "show1" | "show2";

interface PlantillaItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  offset_minutos: number;
  referencia_show: ReferenciaShow;
  tipo_bloque: TipoBloque;
  opciones: string[] | null;
  requerido: boolean;
}

interface Plantilla {
  id: string;
  tipo_evento: string;
  nombre: string;
  items: PlantillaItem[];
}

// ─── Offset helpers ───────────────────────────────────────────────────────────

const MAX_H = 10;
const MAX_MIN = MAX_H * 60; // 600

type OffsetUnit = "al-inicio" | "h-antes" | "h-despues" | "min-antes" | "min-despues";

function minutesToDisplay(min: number): { amount: string; unit: OffsetUnit } {
  if (min === 0) return { amount: "", unit: "al-inicio" };
  const abs = Math.abs(min);
  const dir = min < 0 ? "antes" : "despues";
  if (abs >= 60 && abs % 60 === 0 && abs / 60 <= MAX_H) {
    return { amount: String(abs / 60), unit: `h-${dir}` as OffsetUnit };
  }
  return { amount: String(abs), unit: `min-${dir}` as OffsetUnit };
}

function displayToMinutes(amount: string, unit: OffsetUnit): number {
  if (unit === "al-inicio") return 0;
  const n = parseInt(amount) || 0;
  const mins = unit.startsWith("h-") ? n * 60 : n;
  return unit.endsWith("-antes") ? -mins : mins;
}


const BLOQUES: { tipo: TipoBloque; label: string; desc: string; icon: React.ElementType; color: string; autoInsert?: boolean }[] = [
  { tipo: "foto",               label: "Foto",           desc: "Evidencia fotográfica",        icon: Camera,       color: "bg-orange-50 border-orange-200 text-orange-700" },
  { tipo: "texto",              label: "Texto",          desc: "Campo de texto libre",          icon: Type,         color: "bg-blue-50 border-blue-200 text-blue-700" },
  { tipo: "numero",             label: "Número",         desc: "Valor numérico / cantidad",     icon: Hash,         color: "bg-green-50 border-green-200 text-green-700" },
  { tipo: "select",             label: "Selector",       desc: "Opción de una lista",           icon: List,         color: "bg-purple-50 border-purple-200 text-purple-700" },
  { tipo: "checkbox",           label: "Check",          desc: "Confirmación sí / no",          icon: CheckSquare,  color: "bg-slate-50 border-slate-200 text-slate-700" },
  { tipo: "formulario_salida",  label: "Form. Salida",   desc: "Remisión salida de bodega",     icon: PackageOpen,  color: "bg-amber-50 border-amber-200 text-amber-700",  autoInsert: true },
  { tipo: "formulario_retorno", label: "Form. Retorno",  desc: "Remisión retorno a bodega",     icon: PackageCheck, color: "bg-teal-50 border-teal-200 text-teal-700",   autoInsert: true },
];

function bloqueColor(tipo: TipoBloque) {
  return BLOQUES.find(b => b.tipo === tipo)?.color ?? "bg-slate-50 border-slate-200 text-slate-600";
}
function bloqueIcon(tipo: TipoBloque) {
  const Icon = BLOQUES.find(b => b.tipo === tipo)?.icon ?? Camera;
  return <Icon size={11} />;
}

export function AdminPlantillasPage() {
  const navigate = useNavigate();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dragSrcId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Form para nuevo bloque
  const [newBlock, setNewBlock] = useState<Record<string, {
    nombre: string; descripcion: string; offset: string;
    tipo: TipoBloque; opcionesRaw: string; requerido: boolean;
    referenciaShow: ReferenciaShow; step: "tipo" | "form";
  }>>({});

  // Modal nueva plantilla
  const [showNewPlantilla, setShowNewPlantilla] = useState(false);
  const [newTipo, setNewTipo] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [creatingPlantilla, setCreatingPlantilla] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: plantas } = await supabase.from("montaje_plantillas").select("id, tipo_evento, nombre").order("tipo_evento");
    const { data: items } = await supabase.from("montaje_plantilla_items").select("*").order("orden");

    const byPlantilla = new Map<string, PlantillaItem[]>();
    for (const item of items || []) {
      const arr = byPlantilla.get(item.plantilla_id) || [];
      arr.push({ ...item, opciones: item.opciones ?? null });
      byPlantilla.set(item.plantilla_id, arr);
    }
    setPlantillas((plantas || []).map(p => ({ ...p, items: byPlantilla.get(p.id) || [] })));
    setLoading(false);
  }

  async function crearPlantilla() {
    if (!newTipo.trim() || !newNombre.trim()) return;
    setCreatingPlantilla(true);
    await supabase.from("montaje_plantillas").insert({ tipo_evento: newTipo.trim().toUpperCase(), nombre: newNombre.trim() });
    setNewTipo(""); setNewNombre(""); setShowNewPlantilla(false); setCreatingPlantilla(false);
    await load();
  }

  async function deletePlantilla(id: string, tipo: string) {
    if (!confirm(`¿Eliminar la plantilla "${tipo}" y todos sus bloques?`)) return;
    await supabase.from("montaje_plantillas").delete().eq("id", id);
    await load();
  }

  function getBaseTs(ev: { fecha: string; hora_inicio: string | null; hora_inicio_show?: string | null; hora_segundo_show?: string | null }, ref: ReferenciaShow): number {
    const hora = ref === "show1" ? (ev.hora_inicio_show ?? ev.hora_inicio)
               : ref === "show2" ? (ev.hora_segundo_show ?? ev.hora_inicio_show ?? ev.hora_inicio)
               : ev.hora_inicio;
    return new Date(hora ? `${ev.fecha}T${hora}` : `${ev.fecha}T10:00:00`).getTime();
  }

  async function updateReferencia(itemId: string, ref: ReferenciaShow) {
    await supabase.from("montaje_plantilla_items").update({ referencia_show: ref }).eq("id", itemId);
    await load();
  }

  async function addBloqueDirecto(plantillaId: string, tipo_evento: string, tipo: TipoBloque) {
    const nb = newBlock[tipo_evento] ?? { nombre: "", descripcion: "", offset: "0", tipo, opcionesRaw: "", requerido: true, referenciaShow: "show1" as ReferenciaShow, step: "tipo" as const };
    const defaultNombre = tipo === "formulario_salida" ? "Salida de bodega" : "Retorno a bodega";
    await addBloqueInternal(plantillaId, tipo_evento, { ...nb, tipo, nombre: defaultNombre, offset: "0" });
  }

  async function addBloque(plantillaId: string, tipo_evento: string) {
    const nb = newBlock[tipo_evento];
    if (!nb || !nb.nombre.trim()) return;
    await addBloqueInternal(plantillaId, tipo_evento, nb);
  }

  async function addBloqueInternal(plantillaId: string, tipo_evento: string, nb: { nombre: string; descripcion: string; offset: string; tipo: TipoBloque; opcionesRaw: string; requerido: boolean; referenciaShow?: ReferenciaShow }) {
    setSaving(true);

    const ref: ReferenciaShow = nb.referenciaShow ?? "show1";
    const p = plantillas.find(p => p.id === plantillaId)!;
    const orden = (p.items.length > 0 ? Math.max(...p.items.map(i => i.orden)) : -1) + 1;
    const offsetMin = parseInt(nb.offset) || 0;
    const opciones = nb.tipo === "select" && nb.opcionesRaw.trim()
      ? nb.opcionesRaw.split("\n").map(s => s.trim()).filter(Boolean)
      : null;

    const { data: newItem } = await supabase.from("montaje_plantilla_items").insert({
      plantilla_id: plantillaId,
      nombre: nb.nombre.trim(),
      descripcion: nb.descripcion.trim() || null,
      orden, offset_minutos: offsetMin,
      referencia_show: ref,
      tipo_bloque: nb.tipo,
      opciones: opciones ? opciones : null,
      requerido: nb.requerido,
    }).select("id").single();

    // Sync to existing events of this format
    if (newItem) {
      const { data: eventos } = await supabase.from("eventos").select("id, fecha, hora_inicio, hora_inicio_show, hora_segundo_show").eq("formato", tipo_evento);
      if (eventos && eventos.length > 0) {
        await supabase.from("montaje_checkpoints").insert(
          eventos.map((ev: any) => ({
            evento_id: ev.id, plantilla_item_id: newItem.id,
            nombre: nb.nombre.trim(), descripcion: nb.descripcion.trim() || null,
            orden, hora_recordatorio: new Date(getBaseTs(ev, ref) + offsetMin * 60000).toISOString(),
          }))
        );
      }
    }

    setNewBlock(prev => ({ ...prev, [tipo_evento]: { nombre: "", descripcion: "", offset: "0", tipo: "foto", opcionesRaw: "", requerido: true, referenciaShow: "show1", step: "tipo" } }));
    await load();
    setSaving(false);
  }

  async function deleteItem(itemId: string) {
    if (!confirm("¿Eliminar este bloque? Se eliminará también de todos los eventos que usen esta plantilla.")) return;
    await supabase.from("montaje_checkpoints").delete().eq("plantilla_item_id", itemId);
    await supabase.from("montaje_plantilla_items").delete().eq("id", itemId);
    await load();
  }

  async function updateOffset(itemId: string, offset: number) {
    await supabase.from("montaje_plantilla_items").update({ offset_minutos: offset }).eq("id", itemId);
    await load();
  }

  async function reorderItems(plantillaId: string, items: PlantillaItem[], srcId: string, dstId: string) {
    if (srcId === dstId) return;
    const list = [...items];
    const srcIdx = list.findIndex(i => i.id === srcId);
    const dstIdx = list.findIndex(i => i.id === dstId);
    if (srcIdx === -1 || dstIdx === -1) return;
    const [moved] = list.splice(srcIdx, 1);
    list.splice(dstIdx, 0, moved);
    // Update local state immediately for snappy UX
    setPlantillas(prev => prev.map(p =>
      p.id === plantillaId ? { ...p, items: list.map((it, i) => ({ ...it, orden: i })) } : p
    ));
    // Persist to DB
    await Promise.all(list.map((it, i) =>
      supabase.from("montaje_plantilla_items").update({ orden: i }).eq("id", it.id)
    ));
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-5 flex items-center gap-3 border-b border-slate-100 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 shrink-0 -ml-1 transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "hsl(24 95% 53%)" }}>Admin</p>
          <p className="font-bold text-slate-900 text-lg leading-tight">Plantillas de montaje</p>
        </div>
        <button
          onClick={() => setShowNewPlantilla(true)}
          className="flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors focus:outline-none"
          style={{ background: "hsl(222 47% 11%)" }}
        >
          <Plus size={13} /> Nueva plantilla
        </button>
      </div>

      {/* Plantillas */}
      <div className="px-4 space-y-3 md:grid md:grid-cols-1 lg:grid-cols-1">
        {plantillas.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-sm">No hay plantillas</p>
          </div>
        )}

        {plantillas.map(p => {
          const open = expanded === p.tipo_evento;
          const nb = newBlock[p.tipo_evento] ?? { nombre: "", descripcion: "", offset: "0", tipo: "foto" as TipoBloque, opcionesRaw: "", requerido: true, referenciaShow: "show1" as ReferenciaShow, step: "tipo" as const };
          const badgeClass = formatoBadgeClass(p.tipo_evento);

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setExpanded(open ? null : p.tipo_evento)}
                className="w-full text-left px-4 py-4 flex items-center gap-3"
              >
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ${badgeClass}`}>{p.tipo_evento}</span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm text-slate-900">{p.nombre}</p>
                  <p className="text-xs text-slate-400">{p.items.length} bloque{p.items.length !== 1 ? "s" : ""}</p>
                </div>
                {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>

              {open && (
                <div className="border-t border-slate-100 px-4 pb-4">
                  {/* Bloques existentes */}
                  <div className="space-y-2 py-3">
                    {p.items.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-3">Sin bloques. Añade el primero abajo.</p>
                    )}
                    {p.items.map((item) => {
                      const isOver = dragOverId === item.id;
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => { dragSrcId.current = item.id; }}
                          onDragOver={e => { e.preventDefault(); setDragOverId(item.id); }}
                          onDragLeave={() => setDragOverId(null)}
                          onDrop={() => {
                            if (dragSrcId.current) reorderItems(p.id, p.items, dragSrcId.current, item.id);
                            setDragOverId(null); dragSrcId.current = null;
                          }}
                          onDragEnd={() => { setDragOverId(null); dragSrcId.current = null; }}
                          className="flex items-start gap-2.5 rounded-xl p-3 transition-all select-none"
                          style={{
                            background: isOver ? "hsl(24 95% 96%)" : "hsl(220 13% 96%)",
                            border: `1.5px ${isOver ? "dashed hsl(24 95% 70%)" : "solid transparent"}`,
                            cursor: "grab",
                          }}
                        >
                          <GripVertical size={14} className="text-slate-400 shrink-0 mt-1" />
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 mt-0.5 ${bloqueColor(item.tipo_bloque)}`}>
                            {bloqueIcon(item.tipo_bloque)}
                            {item.tipo_bloque}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-900">{item.nombre}</p>
                            {item.descripcion && <p className="text-xs text-slate-500 mt-0.5">{item.descripcion}</p>}
                            {item.tipo_bloque === "select" && item.opciones && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.opciones.join(" · ")}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {!item.requerido && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Opcional</span>}
                                <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
                                <Clock size={10} className="text-slate-400 shrink-0" />
                                <OffsetPicker
                                  value={item.offset_minutos}
                                  onChange={v => updateOffset(item.id, v)}
                                  small
                                />
                                <select
                                  value={item.referencia_show ?? "show1"}
                                  onChange={e => updateReferencia(item.id, e.target.value as ReferenciaShow)}
                                  className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-[10px] text-slate-600 focus:outline-none"
                                >
                                  <option value="show1">1er show</option>
                                  <option value="show2">2º show</option>
                                  <option value="inicio">Inicio evento</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteItem(item.id)}
                            onMouseDown={e => e.stopPropagation()}
                            className="text-red-400 hover:text-red-600 p-1 shrink-0 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Añadir bloque — 2 pasos */}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Añadir bloque</p>

                    {nb.step === "tipo" ? (
                      /* Paso 1: elegir tipo */
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-7">
                        {BLOQUES.map(b => (
                          <button
                            key={b.tipo}
                            disabled={saving}
                            onClick={() => b.autoInsert
                              ? addBloqueDirecto(p.id, p.tipo_evento, b.tipo)
                              : setNewBlock(prev => ({ ...prev, [p.tipo_evento]: { ...nb, tipo: b.tipo, step: "form" } }))
                            }
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors hover:border-slate-300 disabled:opacity-40 ${nb.tipo === b.tipo ? bloqueColor(b.tipo) : "border-slate-100 bg-white text-slate-500"}`}
                          >
                            <b.icon size={18} />
                            <span className="text-[10px] font-semibold leading-tight text-center">{b.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      /* Paso 2: configurar */
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${bloqueColor(nb.tipo)}`}>
                            {bloqueIcon(nb.tipo)} {nb.tipo}
                          </span>
                          <button onClick={() => setNewBlock(prev => ({ ...prev, [p.tipo_evento]: { ...nb, step: "tipo" } }))} className="text-xs text-slate-400 hover:text-slate-600">← cambiar</button>
                        </div>
                        <input
                          type="text"
                          placeholder="Nombre del bloque"
                          value={nb.nombre}
                          onChange={e => setNewBlock(prev => ({ ...prev, [p.tipo_evento]: { ...nb, nombre: e.target.value } }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400"
                        />
                        <input
                          type="text"
                          placeholder="Descripción opcional"
                          value={nb.descripcion}
                          onChange={e => setNewBlock(prev => ({ ...prev, [p.tipo_evento]: { ...nb, descripcion: e.target.value } }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                        {nb.tipo === "select" && (
                          <textarea
                            placeholder={"Opciones (una por línea)\nEj: Bueno\nRegular\nMalo"}
                            value={nb.opcionesRaw}
                            onChange={e => setNewBlock(prev => ({ ...prev, [p.tipo_evento]: { ...nb, opcionesRaw: e.target.value } }))}
                            rows={3}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400 resize-none"
                          />
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={nb.requerido}
                              onChange={e => setNewBlock(prev => ({ ...prev, [p.tipo_evento]: { ...nb, requerido: e.target.checked } }))}
                              className="rounded"
                            />
                            Obligatorio
                          </label>
                          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                            <Clock size={12} className="text-slate-400 shrink-0" />
                            <OffsetPicker
                              value={parseInt(nb.offset) || 0}
                              onChange={v => setNewBlock(prev => ({ ...prev, [p.tipo_evento]: { ...nb, offset: String(v) } }))}
                            />
                            <select
                              value={nb.referenciaShow ?? "show1"}
                              onChange={e => setNewBlock(prev => ({ ...prev, [p.tipo_evento]: { ...nb, referenciaShow: e.target.value as ReferenciaShow } }))}
                              className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-slate-400"
                            >
                              <option value="show1">1er show</option>
                              <option value="show2">2º show</option>
                              <option value="inicio">Inicio evento</option>
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={() => addBloque(p.id, p.tipo_evento)}
                          disabled={saving || !nb.nombre.trim()}
                          className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                          <Plus size={15} /> Añadir bloque
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Danger */}
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <button onClick={() => deletePlantilla(p.id, p.tipo_evento)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                      Eliminar plantilla "{p.tipo_evento}"
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal nueva plantilla */}
      {showNewPlantilla && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowNewPlantilla(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Nueva plantilla</h3>
              <button onClick={() => setShowNewPlantilla(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Código de tipo</label>
                <input type="text" value={newTipo} onChange={e => setNewTipo(e.target.value.toUpperCase())} placeholder="CDL, BOL, IGW…" maxLength={6}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Nombre descriptivo</label>
                <input type="text" value={newNombre} onChange={e => setNewNombre(e.target.value)} placeholder="Experiencia CDL"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400" />
              </div>
            </div>
            <button
              onClick={crearPlantilla}
              disabled={creatingPlantilla || !newTipo.trim() || !newNombre.trim()}
              className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {creatingPlantilla ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
              Crear plantilla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OffsetPicker ─────────────────────────────────────────────────────────────

function OffsetPicker({ value, onChange, small = false }: {
  value: number;
  onChange: (v: number) => void;
  small?: boolean;
}) {
  const init = minutesToDisplay(value);
  const [amount, setAmount] = useState(init.amount);
  const [unit, setUnit] = useState<OffsetUnit>(init.unit);
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (value !== lastCommitted.current) {
      const d = minutesToDisplay(value);
      setAmount(d.amount);
      setUnit(d.unit);
      lastCommitted.current = value;
    }
  }, [value]);

  function commit(newAmount: string, newUnit: OffsetUnit) {
    if (newUnit === "al-inicio") {
      lastCommitted.current = 0;
      onChange(0);
      return;
    }
    const n = parseInt(newAmount);
    if (isNaN(n) || n <= 0) return;
    const isH = newUnit.startsWith("h-");
    if (isH && n > MAX_H) {
      alert(`El máximo son ${MAX_H}h de diferencia con la hora de inicio del show.`);
      return;
    }
    if (!isH && n > MAX_MIN) {
      alert(`El máximo son ${MAX_MIN} min (${MAX_H}h) de diferencia con la hora de inicio del show.`);
      return;
    }
    const mins = displayToMinutes(newAmount, newUnit);
    lastCommitted.current = mins;
    onChange(mins);
  }

  const base = "bg-white border border-slate-200 focus:outline-none focus:border-slate-400";
  const numCls = small
    ? `${base} rounded-md w-11 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-700`
    : `${base} rounded-xl w-14 px-2 py-1.5 text-xs tabular-nums text-slate-700`;
  const selCls = small
    ? `${base} rounded-md px-1.5 py-0.5 text-[10px] text-slate-600`
    : `${base} rounded-xl px-2 py-1.5 text-xs text-slate-600`;

  return (
    <div className="flex items-center gap-1">
      {unit !== "al-inicio" && (
        <input
          type="number"
          min={1}
          max={unit.startsWith("h-") ? MAX_H : MAX_MIN}
          value={amount}
          placeholder="—"
          onChange={e => { setAmount(e.target.value); commit(e.target.value, unit); }}
          className={numCls}
        />
      )}
      <select
        value={unit}
        onChange={e => { const u = e.target.value as OffsetUnit; setUnit(u); commit(amount, u); }}
        className={selCls}
      >
        <option value="al-inicio">Al inicio del show</option>
        <option value="h-antes">h antes</option>
        <option value="h-despues">h después</option>
        <option value="min-antes">min antes</option>
        <option value="min-despues">min después</option>
      </select>
    </div>
  );
}
