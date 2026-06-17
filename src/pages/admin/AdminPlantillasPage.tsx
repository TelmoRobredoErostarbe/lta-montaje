import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TIPOS = ["CDL", "BOL", "TJR", "TJE", "IGW"];

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

export function AdminPlantillasPage() {
  const navigate = useNavigate();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState<{ [pid: string]: { nombre: string; descripcion: string; offset: string } }>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: plantas } = await supabase.from("montaje_plantillas").select("id, tipo_evento, nombre").order("tipo_evento");
    const { data: items } = await supabase.from("montaje_plantilla_items").select("*").order("orden");

    const byPlantilla = new Map<string, PlantillaItem[]>();
    for (const item of items || []) {
      (byPlantilla.get(item.plantilla_id) || byPlantilla.set(item.plantilla_id, []).get(item.plantilla_id)!).push(item);
    }

    // Ensure all TIPOS have a plantilla entry (create missing)
    const mapped: Plantilla[] = [];
    for (const tipo of TIPOS) {
      const p = (plantas || []).find(p => p.tipo_evento === tipo);
      if (p) {
        mapped.push({ ...p, items: byPlantilla.get(p.id) || [] });
      } else {
        mapped.push({ id: "", tipo_evento: tipo, nombre: `Experiencia ${tipo}`, items: [] });
      }
    }
    setPlantillas(mapped);
    setLoading(false);
  }

  async function ensurePlantilla(tipo: string): Promise<string> {
    let p = plantillas.find(p => p.tipo_evento === tipo);
    if (p?.id) return p.id;
    const { data } = await supabase.from("montaje_plantillas").insert({ tipo_evento: tipo, nombre: `Experiencia ${tipo}` }).select("id").single();
    await load();
    return data!.id;
  }

  async function addItem(tipo: string) {
    const p = plantillas.find(p => p.tipo_evento === tipo)!;
    const ni = newItem[tipo] || { nombre: "", descripcion: "", offset: "0" };
    if (!ni.nombre.trim()) return;
    setSaving(true);
    const pid = await ensurePlantilla(tipo);
    const orden = (p.items.length > 0 ? Math.max(...p.items.map(i => i.orden)) : -1) + 1;
    await supabase.from("montaje_plantilla_items").insert({
      plantilla_id: pid,
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

  function offsetLabel(min: number) {
    if (min === 0) return "Al inicio";
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const label = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
    return min < 0 ? `${label} antes` : `${label} después`;
  }

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><ArrowLeft size={18} /></button>
        <div>
          <p className="font-semibold text-sm text-gray-900">Plantillas de montaje</p>
          <p className="text-xs text-gray-400">Un paso = una foto obligatoria</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {plantillas.map(p => {
          const open = expanded === p.tipo_evento;
          const ni = newItem[p.tipo_evento] || { nombre: "", descripcion: "", offset: "0" };
          return (
            <div key={p.tipo_evento} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button onClick={() => setExpanded(open ? null : p.tipo_evento)} className="w-full text-left px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center text-sm font-bold">{p.tipo_evento}</span>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{p.nombre}</p>
                    <p className="text-xs text-gray-400">{p.items.length} paso{p.items.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {open && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  {/* Items list */}
                  <div className="space-y-2 py-3">
                    {p.items.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Sin pasos todavía. Añade el primero abajo.</p>}
                    {p.items.map((item, idx) => (
                      <div key={item.id} className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                        <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0 mt-0.5">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{item.nombre}</p>
                          {item.descripcion && <p className="text-xs text-gray-500">{item.descripcion}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            <Clock size={10} className="text-gray-400" />
                            <select
                              value={item.offset_minutos}
                              onChange={e => updateOffset(item.id, parseInt(e.target.value))}
                              className="text-[11px] bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-gray-600 focus:outline-none"
                            >
                              {[-240, -180, -120, -90, -60, -45, -30, -15, 0, 15, 30, 60, 90, 120].map(v => (
                                <option key={v} value={v}>{offsetLabel(v)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new item */}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Añadir paso</p>
                    <input
                      type="text"
                      placeholder="Nombre del paso (ej: Escenario montado)"
                      value={ni.nombre}
                      onChange={e => setNewItem(prev => ({ ...prev, [p.tipo_evento]: { ...ni, nombre: e.target.value } }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <input
                      type="text"
                      placeholder="Descripción opcional"
                      value={ni.descripcion}
                      onChange={e => setNewItem(prev => ({ ...prev, [p.tipo_evento]: { ...ni, descripcion: e.target.value } }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-gray-400 shrink-0" />
                      <select
                        value={ni.offset}
                        onChange={e => setNewItem(prev => ({ ...prev, [p.tipo_evento]: { ...ni, offset: e.target.value } }))}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                      >
                        {[-240, -180, -120, -90, -60, -45, -30, -15, 0, 15, 30, 60, 90, 120].map(v => (
                          <option key={v} value={v}>{offsetLabel(v)}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => addItem(p.tipo_evento)}
                      disabled={saving || !ni.nombre.trim()}
                      className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus size={15} /> Añadir paso
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
