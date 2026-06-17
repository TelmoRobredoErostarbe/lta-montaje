import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, Clock, ChevronDown, ChevronUp, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatoBadgeClass } from "@/lib/formatoColors";

interface PlantillaItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  offset_minutos: number;
}

interface Plantilla {
  id: string;
  tipo_evento: string;
  nombre: string;
  items: PlantillaItem[];
}

const OFFSETS = [-240, -180, -120, -90, -60, -45, -30, -15, 0, 15, 30, 60, 90, 120];

function offsetLabel(min: number) {
  if (min === 0) return "Al inicio del evento";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const label = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
  return min < 0 ? `${label} antes` : `${label} después`;
}

export function AdminPlantillasPage() {
  const navigate = useNavigate();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState<Record<string, { nombre: string; descripcion: string; offset: string }>>({});
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
      arr.push(item);
      byPlantilla.set(item.plantilla_id, arr);
    }

    setPlantillas((plantas || []).map(p => ({ ...p, items: byPlantilla.get(p.id) || [] })));
    setLoading(false);
  }

  async function crearPlantilla() {
    if (!newTipo.trim() || !newNombre.trim()) return;
    setCreatingPlantilla(true);
    await supabase.from("montaje_plantillas").insert({
      tipo_evento: newTipo.trim().toUpperCase(),
      nombre: newNombre.trim(),
    });
    setNewTipo("");
    setNewNombre("");
    setShowNewPlantilla(false);
    setCreatingPlantilla(false);
    await load();
  }

  async function deletePlantilla(id: string, tipo: string) {
    if (!confirm(`¿Eliminar la plantilla "${tipo}" y todos sus pasos?`)) return;
    await supabase.from("montaje_plantillas").delete().eq("id", id);
    await load();
  }

  async function addItem(plantillaId: string, tipo: string) {
    const ni = newItem[tipo] || { nombre: "", descripcion: "", offset: "0" };
    if (!ni.nombre.trim()) return;
    setSaving(true);
    const p = plantillas.find(p => p.id === plantillaId)!;
    const orden = (p.items.length > 0 ? Math.max(...p.items.map(i => i.orden)) : -1) + 1;
    await supabase.from("montaje_plantilla_items").insert({
      plantilla_id: plantillaId,
      nombre: ni.nombre.trim(),
      descripcion: ni.descripcion.trim() || null,
      orden,
      offset_minutos: parseInt(ni.offset) || 0,
    });
    setNewItem(prev => ({ ...prev, [tipo]: { nombre: "", descripcion: "", offset: "0" } }));
    await load();
    setSaving(false);
  }

  async function deleteItem(itemId: string) {
    if (!confirm("¿Eliminar este paso?")) return;
    await supabase.from("montaje_plantilla_items").delete().eq("id", itemId);
    await load();
  }

  async function updateOffset(itemId: string, offset: number) {
    await supabase.from("montaje_plantilla_items").update({ offset_minutos: offset }).eq("id", itemId);
    await load();
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 shrink-0">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">Plantillas de montaje</p>
          <p className="text-xs text-slate-400">Un paso = una foto obligatoria</p>
        </div>
        <button
          onClick={() => setShowNewPlantilla(true)}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          <Plus size={13} /> Nueva
        </button>
      </div>

      {/* Plantillas */}
      <div className="px-4 space-y-3">
        {plantillas.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-sm">No hay plantillas creadas</p>
            <p className="text-slate-300 text-xs mt-1">Pulsa "Nueva" para crear la primera</p>
          </div>
        )}

        {plantillas.map(p => {
          const open = expanded === p.tipo_evento;
          const ni = newItem[p.tipo_evento] || { nombre: "", descripcion: "", offset: "0" };
          const badgeClass = formatoBadgeClass(p.tipo_evento);

          return (
            <div key={p.id || p.tipo_evento} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setExpanded(open ? null : p.tipo_evento)}
                className="w-full text-left px-4 py-4 flex items-center gap-3"
              >
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ${badgeClass}`}>
                  {p.tipo_evento}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm text-slate-900">{p.nombre}</p>
                  <p className="text-xs text-slate-400">{p.items.length} paso{p.items.length !== 1 ? "s" : ""}</p>
                </div>
                {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>

              {open && (
                <div className="border-t border-slate-100 px-4 pb-4">
                  {/* Items */}
                  <div className="space-y-2 py-3">
                    {p.items.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-3">Sin pasos. Añade el primero abajo.</p>
                    )}
                    {p.items.map((item, idx) => (
                      <div key={item.id} className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3">
                        <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900">{item.nombre}</p>
                          {item.descripcion && <p className="text-xs text-slate-500 mt-0.5">{item.descripcion}</p>}
                          <div className="flex items-center gap-1.5 mt-2">
                            <Clock size={10} className="text-slate-400" />
                            <select
                              value={item.offset_minutos}
                              onChange={e => updateOffset(item.id, parseInt(e.target.value))}
                              className="text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-600 focus:outline-none"
                            >
                              {OFFSETS.map(v => <option key={v} value={v}>{offsetLabel(v)}</option>)}
                            </select>
                          </div>
                        </div>
                        <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600 p-1 shrink-0 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add item */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Añadir paso</p>
                    <input
                      type="text"
                      placeholder="Nombre del paso (ej: Escenario montado)"
                      value={ni.nombre}
                      onChange={e => setNewItem(prev => ({ ...prev, [p.tipo_evento]: { ...ni, nombre: e.target.value } }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400 transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Descripción opcional"
                      value={ni.descripcion}
                      onChange={e => setNewItem(prev => ({ ...prev, [p.tipo_evento]: { ...ni, descripcion: e.target.value } }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400 transition-colors"
                    />
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <select
                        value={ni.offset}
                        onChange={e => setNewItem(prev => ({ ...prev, [p.tipo_evento]: { ...ni, offset: e.target.value } }))}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400 transition-colors"
                      >
                        {OFFSETS.map(v => <option key={v} value={v}>{offsetLabel(v)}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={() => addItem(p.id, p.tipo_evento)}
                      disabled={saving || !ni.nombre.trim()}
                      className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus size={15} /> Añadir paso
                    </button>
                  </div>

                  {/* Danger: delete plantilla */}
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <button
                      onClick={() => deletePlantilla(p.id, p.tipo_evento)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
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
                <input
                  type="text"
                  value={newTipo}
                  onChange={e => setNewTipo(e.target.value.toUpperCase())}
                  placeholder="Ej: CDL, BOL, IGW…"
                  maxLength={6}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Nombre descriptivo</label>
                <input
                  type="text"
                  value={newNombre}
                  onChange={e => setNewNombre(e.target.value)}
                  placeholder="Ej: Experiencia CDL"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={crearPlantilla}
              disabled={creatingPlantilla || !newTipo.trim() || !newNombre.trim()}
              className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {creatingPlantilla
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Plus size={16} />}
              Crear plantilla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
