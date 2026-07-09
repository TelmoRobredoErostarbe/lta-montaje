import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatoBadgeClass } from "@/lib/formatoColors";
import { formatHora, formatTs } from "@/lib/utils";
import {
  ArrowLeft, Camera, CheckCircle2, Clock, Upload, X, Settings,
  PackageOpen, PackageCheck, ChevronDown, ChevronUp, Check, Image as ImageIcon,
  MapPin, CalendarDays, Music2, Wrench,
} from "lucide-react";
import { detectExperiencia, buildPasos, CDL_SEGUNDO_SHOW_OFFSETS, type ExperienciaType } from "@/lib/plantillaTemplates";

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoBloque = "foto" | "texto" | "numero" | "select" | "checkbox" | "formulario_salida" | "formulario_retorno";

interface Checkpoint {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  hora_recordatorio: string | null;
  tipo_bloque: TipoBloque;
  opciones: string[] | null;
  requerido: boolean;
  valor: any | null;
  fotos: { id: string; foto_url: string; mensaje: string | null; created_at: string }[];
}

type ReferenciaShow = "inicio" | "show1" | "show2";

interface Evento {
  id: string;
  codigo: string;
  ciudad: string;
  fecha: string;
  hora_inicio: string | null;
  hora_inicio_show: string | null;
  hora_segundo_show: string | null;
  formato: string;
  segundo_show: boolean | null;
  con_desmontaje: boolean | null;
  segundo_show_opcion: number | null;
}

function getBaseTs(ev: Evento, ref: ReferenciaShow): number {
  const hora = ref === "show1" ? (ev.hora_inicio_show ?? ev.hora_inicio)
             : ref === "show2" ? (ev.hora_segundo_show ?? ev.hora_inicio_show ?? ev.hora_inicio)
             : ev.hora_inicio;
  return new Date(hora ? `${ev.fecha}T${hora}` : `${ev.fecha}T10:00:00`).getTime();
}

interface Plantilla { id: string; tipo_evento: string; nombre: string; }

interface InventarioItem {
  id: string;
  numero: number;
  nombre: string;
}

interface Remision {
  item_id: string;
  cantidad: number | null;
  estado: string | null;
  bodega_id: string | null;
  venue_id: string | null;
  novedad: string | null;
}

interface Bodega { id: string; nombre: string; }
interface Venue { id: string; nombre: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ESTADOS = ["Bueno", "Regular", "Dañado", "Incompleto"];

function completoCheckpoint(cp: Checkpoint): boolean {
  if (!cp.requerido) return true;
  switch (cp.tipo_bloque) {
    case "foto": return cp.fotos.length > 0;
    case "checkbox": return cp.valor === true;
    default: return cp.valor !== null && cp.valor !== "" && cp.valor !== undefined;
  }
}

function remisionCompleta(items: InventarioItem[], rems: Record<string, Remision>): boolean {
  return items.every(it => {
    const r = rems[it.id];
    return r && r.cantidad !== null && r.estado !== null;
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CoordEventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);

  // Foto upload
  const [activeUpload, setActiveUpload] = useState<{ cpId: string; file: File; preview: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

  // Plantilla modal
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [applyingPlantilla, setApplyingPlantilla] = useState(false);

  // Inventario remisión
  const [inventarioItems, setInventarioItems] = useState<InventarioItem[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [remSalida, setRemSalida] = useState<Record<string, Remision>>({});
  const [remRetorno, setRemRetorno] = useState<Record<string, Remision>>({});
  const [remisionModal, setRemisionModal] = useState<{ etapa: "salida" | "retorno"; step: number } | null>(null);
  const [savedRem, setSavedRem] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Preguntas dinámicas
  const [respondiendo, setRespondiendo] = useState<string | null>(null);

  // Bodega/venue a nivel de bloque (iguales para todos los ítems de la remisión)
  const [salidaBodegaId, setSalidaBodegaId] = useState<string | null>(null);
  const [salidaVenueId, setSalidaVenueId] = useState<string | null>(null);
  const [retornoBodegaId, setRetornoBodegaId] = useState<string | null>(null);
  // Fotos de remision (una por etapa)
  const [remFotos, setRemFotos] = useState<{ salida?: string; retorno?: string }>({});
  const [uploadingRemFoto, setUploadingRemFoto] = useState<"salida" | "retorno" | null>(null);

  useEffect(() => { if (id && user) load(); }, [id, user]);

  // ── Load ──────────────────────────────────────────────────────────────────

  async function load(silent = false) {
    const scrollY = silent ? window.scrollY : 0;
    if (!silent) setLoading(true);
    const [{ data: ev }, { data: cps }, { data: plantas }] = await Promise.all([
      supabase.from("eventos").select("id, codigo, ciudad, fecha, hora_inicio, hora_inicio_show, hora_segundo_show, formato, segundo_show, con_desmontaje, segundo_show_opcion").eq("id", id!).maybeSingle(),
      supabase.from("montaje_checkpoints").select("id, nombre, descripcion, orden, hora_recordatorio, valor, plantilla_item_id, tipo_bloque").eq("evento_id", id!).order("orden"),
      supabase.from("montaje_plantillas").select("id, tipo_evento, nombre").order("tipo_evento"),
    ]);

    if (!ev) { setLoading(false); return; }
    setPlantillas(plantas || []);

    let cpList = cps || [];
    if (cpList.length === 0) {
      await generarCheckpointsDesde(ev, plantas || []);
      const { data: nuevos } = await supabase.from("montaje_checkpoints").select("id, nombre, descripcion, orden, hora_recordatorio, valor, plantilla_item_id").eq("evento_id", id!).order("orden");
      cpList = nuevos || [];
    }

    // Enriquecer con tipo_bloque/opciones/requerido desde plantilla_items
    const itemIds = cpList.map((c: any) => c.plantilla_item_id).filter(Boolean);
    let itemsMap: Record<string, any> = {};
    if (itemIds.length > 0) {
      const { data: pitems } = await supabase.from("montaje_plantilla_items").select("id, tipo_bloque, opciones, requerido").in("id", itemIds);
      for (const pi of pitems || []) itemsMap[pi.id] = pi;
    }
    const enriched = cpList.map((cp: any) => {
      const pi = itemsMap[cp.plantilla_item_id] || {};
      return { ...cp, tipo_bloque: cp.tipo_bloque || pi.tipo_bloque || "foto", opciones: pi.opciones || null, requerido: pi.requerido ?? true };
    });

    await cargarFotos(ev, enriched);

    // Cargar inventario si el formato tiene items
    const fmt = ev.formato?.toUpperCase();
    if (["CDL", "TJR", "BOL", "TJE"].includes(fmt)) {
      const [{ data: invItems }, { data: bo }, { data: ve }, { data: rems }] = await Promise.all([
        supabase.from("inventario_items").select("id, numero, nombre").eq("formato", fmt).order("orden"),
        supabase.from("bodegas").select("id, nombre").eq("activa", true).order("nombre"),
        supabase.from("inventario_venues").select("id, nombre").eq("formato", fmt).order("nombre"),
        supabase.from("inventario_evento_remisiones").select("*").eq("evento_id", ev.id),
      ]);
      setInventarioItems(invItems || []);
      setBodegas(bo || []);
      setVenues(ve || []);

      const sal: Record<string, Remision> = {};
      const ret: Record<string, Remision> = {};
      for (const r of rems || []) {
        const rem: Remision = { item_id: r.item_id, cantidad: r.cantidad, estado: r.estado, bodega_id: r.bodega_id, venue_id: r.venue_id, novedad: r.novedad };
        if (r.etapa === "salida") sal[r.item_id] = rem;
        else ret[r.item_id] = rem;
      }
      setRemSalida(sal);
      setRemRetorno(ret);
      // Init block-level bodega/venue from first existing row
      const firstSal = (rems || []).find((r: any) => r.etapa === "salida");
      const firstRet = (rems || []).find((r: any) => r.etapa === "retorno");
      if (firstSal?.bodega_id) setSalidaBodegaId(firstSal.bodega_id);
      if (firstSal?.venue_id) setSalidaVenueId(firstSal.venue_id);
      if (firstRet?.bodega_id) setRetornoBodegaId(firstRet.bodega_id);

      // Fotos de remision
      const { data: rfRows } = await supabase
        .from("inventario_evento_fotos")
        .select("etapa, foto_url")
        .eq("evento_id", ev.id)
        .order("created_at", { ascending: false });
      const rf: { salida?: string; retorno?: string } = {};
      for (const r of rfRows || []) {
        if (!rf[r.etapa as "salida" | "retorno"]) rf[r.etapa as "salida" | "retorno"] = r.foto_url;
      }
      setRemFotos(rf);
    }

    setLoading(false);
    if (silent) requestAnimationFrame(() => window.scrollTo(0, scrollY));
  }

  async function subirFotoRemision(etapa: "salida" | "retorno", file: File) {
    if (!evento || !user) return;
    setUploadingRemFoto(etapa);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `montaje/${evento.id}/remision-${etapa}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("montaje-fotos").upload(path, file);
    if (error) { alert("Error subiendo foto: " + error.message); setUploadingRemFoto(null); return; }
    const { data: { publicUrl } } = supabase.storage.from("montaje-fotos").getPublicUrl(path);
    // Use block-level bodega_id (set by selector at top of RemisionSection)
    const bodegaId = etapa === "salida" ? salidaBodegaId : retornoBodegaId;
    await supabase.from("inventario_evento_fotos").insert({
      evento_id: evento.id, bodega_id: bodegaId, etapa, foto_url: publicUrl, coordinador_id: user.id,
    });
    setRemFotos(prev => ({ ...prev, [etapa]: publicUrl }));
    setUploadingRemFoto(null);
  }

  async function generarCheckpointsDesde(ev: Evento, plantas: Plantilla[]) {
    let tipo = ev.formato?.toUpperCase();
    if (tipo === "CDL") {
      const { cdlVariant } = detectExperiencia(ev.codigo);
      tipo = `CDL${cdlVariant}`;
    }
    const plantilla = plantas.find(p => p.tipo_evento === tipo);
    if (!plantilla) return;
    const { data: items } = await supabase.from("montaje_plantilla_items").select("*").eq("plantilla_id", plantilla.id).order("orden");
    if (!items || items.length === 0) return;
    await supabase.from("montaje_checkpoints").insert(
      items.map((item: any) => ({
        evento_id: ev.id, plantilla_item_id: item.id,
        nombre: item.nombre, descripcion: item.descripcion,
        orden: item.orden,
        hora_recordatorio: new Date(getBaseTs(ev, (item.referencia_show ?? "show1") as ReferenciaShow) + item.offset_minutos * 60000).toISOString(),
      }))
    );
  }

  async function cargarFotos(ev: Evento, cps: any[]) {
    setEvento(ev);
    if (cps.length === 0) { setCheckpoints([]); return; }
    const cpIds = cps.map(c => c.id);
    const { data: fotos } = await supabase.from("montaje_fotos").select("id, checkpoint_id, foto_url, mensaje, created_at").in("checkpoint_id", cpIds).order("created_at");
    const fotosByCp = new Map<string, any[]>();
    for (const f of fotos || []) {
      const arr = fotosByCp.get(f.checkpoint_id) || [];
      arr.push(f); fotosByCp.set(f.checkpoint_id, arr);
    }
    setCheckpoints(cps.map(cp => ({ ...cp, fotos: fotosByCp.get(cp.id) || [] })));
  }

  async function aplicarPlantilla(plantillaId: string, clear = true) {
    if (!evento) return;
    setApplyingPlantilla(true);
    if (clear) await supabase.from("montaje_checkpoints").delete().eq("evento_id", evento.id);
    const { data: items } = await supabase.from("montaje_plantilla_items").select("*").eq("plantilla_id", plantillaId).order("orden");
    if (items && items.length > 0) {
      await supabase.from("montaje_checkpoints").insert(
        items.map((item: any) => ({
          evento_id: evento.id, plantilla_item_id: item.id,
          nombre: item.nombre, descripcion: item.descripcion,
          orden: item.orden,
          hora_recordatorio: new Date(getBaseTs(evento, (item.referencia_show ?? "show1") as ReferenciaShow) + item.offset_minutos * 60000).toISOString(),
        }))
      );
    }
    setShowPlantillaModal(false); setApplyingPlantilla(false);
    await load();
  }

  // ── Preguntas dinámicas ────────────────────────────────────────────────────

  async function responderSegundoShow(valor: boolean, opcion?: number) {
    if (!evento) return;
    setRespondiendo("segundo_show");
    const VALID_TIPOS: ExperienciaType[] = ["CDL", "TJR", "TJE", "BOL"];
    const { tipo: tipoFromCodigo, cdlVariant } = detectExperiencia(evento.codigo);
    const tipo: ExperienciaType | null = tipoFromCodigo
      ?? (VALID_TIPOS.includes(evento.formato?.toUpperCase() as ExperienciaType)
          ? evento.formato?.toUpperCase() as ExperienciaType : null);
    const update: any = { segundo_show: valor };
    if (!valor) update.segundo_show_opcion = null;
    if (valor && opcion !== undefined) update.segundo_show_opcion = opcion;
    await supabase.from("eventos").update(update).eq("id", evento.id);

    // Para TJR: no hay pregunta de hora, insertar directamente con opcion=0
    const efectiveOpcion = opcion ?? (tipo !== "CDL" ? 0 : undefined);
    if (valor && efectiveOpcion !== undefined) {
      if (tipo) {
        const horaBase = evento.hora_inicio_show ?? evento.hora_inicio ?? "10:00";
        const baseMs = new Date(`${evento.fecha}T${horaBase}`).getTime();
        const maxOrden = checkpoints.reduce((m, c) => Math.max(m, c.orden), 0);
        const segundoShowPasos = buildPasos(tipo, cdlVariant, true, efectiveOpcion, false)
          .filter(p => p.tipo === "segundo_show");
        if (segundoShowPasos.length > 0) {
          const { error: insErr } = await supabase.from("montaje_checkpoints").insert(
            segundoShowPasos.map((p, i) => ({
              evento_id: evento.id,
              nombre: p.nombre,
              descripcion: null,
              orden: maxOrden + i + 1,
              hora_recordatorio: new Date(baseMs + p.offset_minutos * 60000).toISOString(),
              ...(p.tipo_bloque ? { tipo_bloque: p.tipo_bloque } : {}),
            }))
          );
          if (insErr) { alert("Error insertando pasos segundo show: " + insErr.message); }
        }
      }
    }
    setRespondiendo(null);
    await load(true);
  }

  async function responderHoraSegundoShow(opcion: number) {
    await responderSegundoShow(true, opcion);
  }

  async function responderDesmontaje(valor: boolean) {
    if (!evento) return;
    setRespondiendo("desmontaje");
    const VALID_TIPOS: ExperienciaType[] = ["CDL", "TJR", "TJE", "BOL"];
    const { tipo: tipoFromCodigo, cdlVariant } = detectExperiencia(evento.codigo);
    const tipo: ExperienciaType | null = tipoFromCodigo
      ?? (VALID_TIPOS.includes(evento.formato?.toUpperCase() as ExperienciaType)
          ? evento.formato?.toUpperCase() as ExperienciaType : null);
    await supabase.from("eventos").update({ con_desmontaje: valor }).eq("id", evento.id);

    if (valor) {
      if (tipo) {
        const horaBase = evento.hora_inicio_show ?? evento.hora_inicio ?? "10:00";
        const baseMs = new Date(`${evento.fecha}T${horaBase}`).getTime();
        const maxOrden = checkpoints.reduce((m, c) => Math.max(m, c.orden), 0);
        const opcion = evento.segundo_show_opcion ?? 0;
        const desmontajePasos = buildPasos(tipo, cdlVariant, evento.segundo_show ?? false, opcion, true)
          .filter(p => p.tipo === "desmontaje");
        if (desmontajePasos.length > 0) {
          const { error: insErr } = await supabase.from("montaje_checkpoints").insert(
            desmontajePasos.map((p, i) => ({
              evento_id: evento.id,
              nombre: p.nombre,
              descripcion: null,
              orden: maxOrden + i + 1,
              hora_recordatorio: new Date(baseMs + p.offset_minutos * 60000).toISOString(),
              ...(p.tipo_bloque ? { tipo_bloque: p.tipo_bloque } : {}),
            }))
          );
          if (insErr) { alert("Error insertando pasos desmontaje: " + insErr.message); }
        }
      }
    }
    setRespondiendo(null);
    await load(true);
  }

  // ── Checkpoint non-photo valor ─────────────────────────────────────────────

  async function saveValor(cpId: string, valor: any) {
    await supabase.from("montaje_checkpoints").update({ valor }).eq("id", cpId);
    setCheckpoints(prev => prev.map(c => c.id === cpId ? { ...c, valor } : c));
  }

  // ── Foto upload ────────────────────────────────────────────────────────────

  function handleFileSelect(cpId: string, file: File) {
    setActiveUpload({ cpId, file, preview: URL.createObjectURL(file) });
    setMensaje("");
  }

  async function subirFoto() {
    if (!activeUpload || !user) return;
    setUploading(activeUpload.cpId);
    const { cpId, file } = activeUpload;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `montaje/${id}/${cpId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("montaje-fotos").upload(path, file);
    if (upErr) { alert("Error subiendo imagen: " + upErr.message); setUploading(null); return; }
    const { data: { publicUrl } } = supabase.storage.from("montaje-fotos").getPublicUrl(path);
    await supabase.from("montaje_fotos").insert({ checkpoint_id: cpId, coordinador_id: user.id, foto_url: publicUrl, mensaje: mensaje || null });
    setActiveUpload(null); setMensaje(""); setUploading(null);
    await load();
  }

  // ── Remision inventario ────────────────────────────────────────────────────

  function updateRem(etapa: "salida" | "retorno", itemId: string, patch: Partial<Remision>) {
    const bodegaId = etapa === "salida" ? salidaBodegaId : retornoBodegaId;
    const venueId = etapa === "salida" ? salidaVenueId : null;
    const setter = etapa === "salida" ? setRemSalida : setRemRetorno;
    setter(prev => {
      const current = prev[itemId] ?? { item_id: itemId, cantidad: null, estado: null, bodega_id: bodegaId, venue_id: venueId, novedad: null };
      const updated = { ...current, bodega_id: bodegaId, venue_id: venueId, ...patch };
      scheduleRemSave(etapa, itemId, updated);
      return { ...prev, [itemId]: updated };
    });
  }

  // Cuando cambia bodega/venue a nivel de bloque, sincroniza a todos los ítems
  function updateBlockBodega(etapa: "salida" | "retorno", bodegaId: string | null) {
    if (etapa === "salida") setSalidaBodegaId(bodegaId);
    else setRetornoBodegaId(bodegaId);
    const setter = etapa === "salida" ? setRemSalida : setRemRetorno;
    setter(prev => {
      const updated = { ...prev };
      for (const itemId of Object.keys(updated)) {
        const rem = { ...updated[itemId], bodega_id: bodegaId };
        updated[itemId] = rem;
        scheduleRemSave(etapa, itemId, rem);
      }
      // Also schedule saves for items not yet in state (they'll get bodega when first edited)
      for (const item of inventarioItems) {
        if (!updated[item.id]) {
          const rem = { item_id: item.id, cantidad: null, estado: null, bodega_id: bodegaId, venue_id: etapa === "salida" ? salidaVenueId : null, novedad: null };
          updated[item.id] = rem;
          scheduleRemSave(etapa, item.id, rem);
        }
      }
      return updated;
    });
  }

  function updateBlockVenue(venueId: string | null) {
    setSalidaVenueId(venueId);
    setRemSalida(prev => {
      const updated = { ...prev };
      for (const itemId of Object.keys(updated)) {
        const rem = { ...updated[itemId], venue_id: venueId };
        updated[itemId] = rem;
        scheduleRemSave("salida", itemId, rem);
      }
      for (const item of inventarioItems) {
        if (!updated[item.id]) {
          const rem = { item_id: item.id, cantidad: null, estado: null, bodega_id: salidaBodegaId, venue_id: venueId, novedad: null };
          updated[item.id] = rem;
          scheduleRemSave("salida", item.id, rem);
        }
      }
      return updated;
    });
  }

  function scheduleRemSave(etapa: "salida" | "retorno", itemId: string, rem: Remision) {
    const key = `${etapa}-${itemId}`;
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => persistRem(etapa, itemId, rem), 800);
  }

  async function persistRem(etapa: "salida" | "retorno", itemId: string, rem: Remision) {
    if (!evento) return;
    await supabase.from("inventario_evento_remisiones").upsert(
      { evento_id: evento.id, item_id: itemId, etapa, cantidad: rem.cantidad, estado: rem.estado, bodega_id: rem.bodega_id, venue_id: rem.venue_id, novedad: rem.novedad, coordinador_id: user?.id, updated_at: new Date().toISOString() },
      { onConflict: "evento_id,item_id,etapa" }
    );
    setSavedRem(itemId);
    setTimeout(() => setSavedRem(null), 800);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">
      <div className="card-crm p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton rounded w-1/3" />
            <div className="h-5 skeleton rounded w-2/3" />
            <div className="h-3 skeleton rounded w-1/2" />
          </div>
        </div>
      </div>
      <div className="card-crm p-4">
        <div className="h-3 skeleton rounded w-1/4 mb-3" />
        <div className="h-2 skeleton rounded w-full" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-full skeleton shrink-0 mt-3" />
          <div className="flex-1 card-crm p-4 space-y-2">
            <div className="h-4 skeleton rounded w-1/2" />
            <div className="h-3 skeleton rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
  if (!evento) return <div className="p-6 text-center" style={{ color: "hsl(218 11% 65%)" }}>Evento no encontrado</div>;

  const completados = checkpoints.filter(c => completoCheckpoint(c)).length;
  const badgeClass = formatoBadgeClass(evento.formato);
  const hasSalidaBloque = checkpoints.some(c => c.tipo_bloque === "formulario_salida");
  const hasRetornoBloque = checkpoints.some(c => c.tipo_bloque === "formulario_retorno");
  const hasInventario = inventarioItems.length > 0 && (hasSalidaBloque || hasRetornoBloque);
  const salidaOk = hasSalidaBloque && inventarioItems.length > 0 && remisionCompleta(inventarioItems, remSalida);
  const retornoOk = hasRetornoBloque && inventarioItems.length > 0 && remisionCompleta(inventarioItems, remRetorno);
  const totalSteps = checkpoints.length;
  const allDone = completados === totalSteps && totalSteps > 0;
  const pct = totalSteps > 0 ? Math.round((completados / totalSteps) * 100) : 0;

  // Accents per formato
  const FORMATO_ACCENT: Record<string, string> = {
    CDL: "hsl(24 95% 53%)", TJR: "hsl(160 84% 39%)", BOL: "hsl(217 91% 60%)", TJE: "hsl(262 83% 58%)",
  };
  const accentColor = FORMATO_ACCENT[evento.formato?.toUpperCase()] ?? "hsl(24 95% 53%)";

  return (
    <div className="max-w-lg mx-auto pb-8 animate-fade-in">
      {/* ── Event hero card ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="card-crm overflow-hidden">
          {/* Color accent top bar */}
          <div className="h-1" style={{ background: accentColor }} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none"
                style={{ color: "hsl(220 9% 46%)", background: "hsl(220 13% 95%)" }}
              >
                <ArrowLeft size={13} /> Volver
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowPlantillaModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none"
                  style={{ color: "hsl(220 9% 46%)", background: "hsl(220 13% 95%)" }}
                >
                  <Settings size={13} /> Plantilla
                </button>
              )}
            </div>
            <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-md border mb-2 ${badgeClass}`}>{evento.formato}</span>
            <h1 className="text-lg font-bold leading-tight mb-1" style={{ color: "hsl(222 47% 11%)" }}>{evento.codigo}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(220 9% 46%)" }}>
                <MapPin size={11} /> {evento.ciudad}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(220 9% 46%)" }}>
                <CalendarDays size={11} />
                {new Date(evento.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long" })}
              </span>
              {evento.hora_inicio && (
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: accentColor }}>
                  <Clock size={11} /> {formatHora(evento.hora_inicio)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress card ────────────────────────────────────────────────────── */}
      {(totalSteps > 0 || hasInventario) && (
        <div className="px-4 pb-4">
          <div className="card-crm p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold" style={{ color: "hsl(220 9% 46%)" }}>Progreso del montaje</span>
              <div className="flex items-center gap-1.5">
                {allDone && <CheckCircle2 size={13} className="text-emerald-500" />}
                <span className="text-sm font-bold tabular-nums" style={{ color: "hsl(222 47% 11%)" }}>{completados}<span className="text-xs font-normal" style={{ color: "hsl(218 11% 65%)" }}>/{totalSteps}</span></span>
              </div>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "hsl(220 13% 91%)" }}>
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: allDone ? "#10b981" : accentColor }}
              />
            </div>
            {hasInventario && (
              <div className="flex gap-4 mt-3 pt-2.5" style={{ borderTop: "1px solid hsl(220 13% 95%)" }}>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: salidaOk ? "#059669" : "hsl(218 11% 65%)" }}>
                  <PackageOpen size={11} />
                  <span className="font-medium">Salida {salidaOk ? "✓" : "pendiente"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: retornoOk ? "#059669" : "hsl(218 11% 65%)" }}>
                  <PackageCheck size={11} />
                  <span className="font-medium">Retorno {retornoOk ? "✓" : "pendiente"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {checkpoints.length === 0 && (
        <div className="px-4">
          <div className="card-crm p-8 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(220 13% 95%)" }}>
              <Settings size={22} style={{ color: "hsl(218 11% 65%)" }} />
            </div>
            <p className="font-semibold text-sm mb-1" style={{ color: "hsl(222 47% 11%)" }}>Sin checklist configurado</p>
            <p className="text-xs" style={{ color: "hsl(218 11% 65%)" }}>
              {isAdmin ? "Pulsa «Plantilla» para aplicar una." : "El administrador debe configurar la plantilla para este evento."}
            </p>
          </div>
        </div>
      )}

      {/* ── Timeline de pasos + preguntas inline ─────────────────────────────── */}
      {checkpoints.length > 0 && (() => {
        const VALID_TIPOS: ExperienciaType[] = ["CDL", "TJR", "TJE", "BOL"];
        const { tipo: tipoFromCodigo } = detectExperiencia(evento.codigo);
        const tipo: ExperienciaType | null = tipoFromCodigo
          ?? (VALID_TIPOS.includes(evento.formato?.toUpperCase() as ExperienciaType)
              ? evento.formato?.toUpperCase() as ExperienciaType
              : null);
        const needsSegundoShow = !!tipo && (tipo === "CDL" || tipo === "TJR") && evento.segundo_show === null;
        const needsHora = !!tipo && tipo === "CDL" && evento.segundo_show === true && evento.segundo_show_opcion === null;
        const needsDesmontaje = !!tipo && evento.con_desmontaje === null && (
          evento.segundo_show !== null || tipo === "TJE" || tipo === "BOL"
        );

        const primerShowTime = evento.hora_inicio_show?.slice(0, 5) ?? "18:00";
        function addMins(t: string, m: number) {
          const [h, mm] = t.split(":").map(Number);
          const tot = h * 60 + mm + m;
          return `${String(Math.floor(((tot % 1440) + 1440) % 1440 / 60)).padStart(2,"0")}:${String(((tot % 1440) + 1440) % 1440 % 60).padStart(2,"0")}`;
        }

        return (
          <div className="px-4 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(218 11% 65%)" }}>
              Pasos del montaje
            </p>
            <div className="relative">
              <div
                className="absolute rounded-full"
                style={{ left: "13px", top: "14px", bottom: "14px", width: "2px", background: "hsl(220 13% 91%)" }}
              />
              <div className="space-y-2.5">
                {checkpoints.map((cp, idx) => {
                  if (cp.tipo_bloque === "formulario_salida") {
                    const filledCount = inventarioItems.filter(it => {
                      const r = remSalida[it.id];
                      return r && r.cantidad !== null && r.estado !== null;
                    }).length;
                    const bodegaName = bodegas.find(b => b.id === salidaBodegaId)?.nombre;
                    const venueName = venues.find(v => v.id === salidaVenueId)?.nombre;
                    return (
                      <TimelineRow key={cp.id} done={salidaOk} isFormulario accentColor={accentColor}>
                        <RemisionCard
                          etapa="salida"
                          ok={salidaOk}
                          filledCount={filledCount}
                          totalCount={inventarioItems.length}
                          bodegaName={bodegaName}
                          venueName={venueName}
                          fotoUrl={remFotos.salida}
                          onOpen={() => setRemisionModal({ etapa: "salida", step: 0 })}
                        />
                      </TimelineRow>
                    );
                  }
                  if (cp.tipo_bloque === "formulario_retorno") {
                    const filledCount = inventarioItems.filter(it => {
                      const r = remRetorno[it.id];
                      return r && r.cantidad !== null && r.estado !== null;
                    }).length;
                    const bodegaName = bodegas.find(b => b.id === retornoBodegaId)?.nombre;
                    return (
                      <TimelineRow key={cp.id} done={retornoOk} isFormulario accentColor={accentColor}>
                        <RemisionCard
                          etapa="retorno"
                          ok={retornoOk}
                          filledCount={filledCount}
                          totalCount={inventarioItems.length}
                          bodegaName={bodegaName}
                          fotoUrl={remFotos.retorno}
                          onOpen={() => setRemisionModal({ etapa: "retorno", step: 0 })}
                        />
                      </TimelineRow>
                    );
                  }
                  return (
                    <TimelineRow key={cp.id} done={completoCheckpoint(cp)} stepNumber={idx + 1} accentColor={accentColor}>
                      <CheckpointCard
                        cp={cp}
                        idx={idx}
                        onFotoSelect={handleFileSelect}
                        onValorChange={saveValor}
                        accentColor={accentColor}
                      />
                    </TimelineRow>
                  );
                })}

                {/* ── Preguntas inline al final del timeline ── */}

                {/* ¿Segundo show? */}
                {needsSegundoShow && (
                  <div className="flex gap-3 items-start">
                    <div className="shrink-0 relative z-10 mt-3.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center border-2" style={{ background: "#f0fdf4", borderColor: "#10b981" }}>
                        <Music2 size={13} style={{ color: "#10b981" }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 card-crm p-4">
                      <p className="font-semibold text-sm mb-0.5" style={{ color: "hsl(222 47% 11%)" }}>¿Tiene segundo show?</p>
                      <p className="text-xs mb-3" style={{ color: "hsl(218 11% 65%)" }}>Se añadirán los pasos del segundo show</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => responderSegundoShow(true)} disabled={respondiendo === "segundo_show"}
                          className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: "#d1fae5", color: "#065f46" }}>Sí</button>
                        <button onClick={() => responderSegundoShow(false)} disabled={respondiendo === "segundo_show"}
                          className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: "hsl(220 13% 95%)", color: "hsl(220 9% 46%)" }}>No</button>
                      </div>
                      {respondiendo === "segundo_show" && (
                        <div className="flex items-center justify-center gap-2 mt-2 text-xs" style={{ color: "hsl(218 11% 65%)" }}>
                          <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" /> Guardando…
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ¿A qué hora? (CDL) */}
                {needsHora && (
                  <div className="flex gap-3 items-start">
                    <div className="shrink-0 relative z-10 mt-3.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center border-2" style={{ background: "#f0fdf4", borderColor: "#10b981" }}>
                        <Clock size={13} style={{ color: "#10b981" }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 card-crm p-4">
                      <p className="font-semibold text-sm mb-0.5" style={{ color: "hsl(222 47% 11%)" }}>¿A qué hora es el segundo show?</p>
                      <p className="text-xs mb-3" style={{ color: "hsl(218 11% 65%)" }}>Desde las {primerShowTime} del primer show</p>
                      <div className="flex flex-col gap-2">
                        {CDL_SEGUNDO_SHOW_OFFSETS.map((offset, idx) => (
                          <button key={idx} onClick={() => responderHoraSegundoShow(idx)} disabled={respondiendo === "segundo_show"}
                            className="flex items-center justify-between px-4 py-3 rounded-xl transition-all active:scale-[.98] disabled:opacity-50"
                            style={{ background: "hsl(220 13% 96%)", border: "1.5px solid hsl(220 13% 88%)" }}>
                            <span className="text-xs text-slate-500">+{["2h", "2h 15m", "2h 30m"][idx]}</span>
                            <span className="text-lg font-bold tabular-nums" style={{ color: "hsl(222 47% 11%)" }}>{addMins(primerShowTime, offset)}</span>
                          </button>
                        ))}
                      </div>
                      {respondiendo === "segundo_show" && (
                        <div className="flex items-center justify-center gap-2 mt-2 text-xs" style={{ color: "hsl(218 11% 65%)" }}>
                          <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" /> Guardando…
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ¿Desmontaje? */}
                {needsDesmontaje && (
                  <div className="flex gap-3 items-start">
                    <div className="shrink-0 relative z-10 mt-3.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center border-2" style={{ background: "#fff1f2", borderColor: "#f87171" }}>
                        <Wrench size={13} style={{ color: "#ef4444" }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 card-crm p-4">
                      <p className="font-semibold text-sm mb-0.5" style={{ color: "hsl(222 47% 11%)" }}>¿Tiene desmontaje?</p>
                      <p className="text-xs mb-3" style={{ color: "hsl(218 11% 65%)" }}>Se añadirán los pasos de desmontaje, cargue y bodega</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => responderDesmontaje(true)} disabled={respondiendo === "desmontaje"}
                          className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: "#fee2e2", color: "#991b1b" }}>Sí</button>
                        <button onClick={() => responderDesmontaje(false)} disabled={respondiendo === "desmontaje"}
                          className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: "hsl(220 13% 95%)", color: "hsl(220 9% 46%)" }}>No</button>
                      </div>
                      {respondiendo === "desmontaje" && (
                        <div className="flex items-center justify-center gap-2 mt-2 text-xs" style={{ color: "hsl(218 11% 65%)" }}>
                          <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" /> Guardando…
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal plantilla ──────────────────────────────────────────────────── */}
      {showPlantillaModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowPlantillaModal(false)}>
          <div className="w-full rounded-t-3xl p-6 space-y-4 animate-slide-up" style={{ background: "hsl(0 0% 100%)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: "hsl(222 47% 11%)" }}>Aplicar plantilla</h3>
              <button onClick={() => setShowPlantillaModal(false)} style={{ color: "hsl(218 11% 65%)" }}><X size={20} /></button>
            </div>
            <p className="text-xs" style={{ color: "hsl(220 9% 46%)" }}>Selecciona una plantilla para aplicar al evento. Se reemplazará el checklist actual.</p>
            <div className="space-y-2">
              {plantillas.map(p => (
                <button key={p.id} onClick={() => aplicarPlantilla(p.id)} disabled={applyingPlantilla}
                  className="w-full text-left rounded-xl px-4 py-3 flex items-center justify-between transition-colors disabled:opacity-50 focus:outline-none"
                  style={{ background: "hsl(220 13% 95%)" }}>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "hsl(222 47% 11%)" }}>{p.nombre}</p>
                    <p className="text-xs" style={{ color: "hsl(218 11% 65%)" }}>{p.tipo_evento}</p>
                  </div>
                  {p.tipo_evento === evento.formato?.toUpperCase() && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "hsl(24 95% 53% / 0.1)", color: "hsl(24 95% 53%)" }}>Por defecto</span>
                  )}
                </button>
              ))}
              {plantillas.length === 0 && <p className="text-sm text-center py-4" style={{ color: "hsl(218 11% 65%)" }}>No hay plantillas configuradas</p>}
            </div>
            {applyingPlantilla && (
              <div className="flex items-center justify-center py-2 gap-2 text-sm" style={{ color: "hsl(220 9% 46%)" }}>
                <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" /> Aplicando…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal confirmación foto ──────────────────────────────────────────── */}
      {activeUpload && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4">
            <p className="text-white font-semibold">Confirmar foto</p>
            <button onClick={() => setActiveUpload(null)} className="text-white/60 hover:text-white"><X size={22} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            <img src={activeUpload.preview} alt="preview" className="max-h-[55vh] w-full object-contain rounded-2xl" />
          </div>
          <div className="p-4 space-y-3">
            <input type="text" value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="Nota opcional sobre esta foto"
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }} />
            <button onClick={subirFoto} disabled={!!uploading}
              className="w-full rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none"
              style={{ background: "white", color: "hsl(222 47% 11%)" }}>
              {uploading ? <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" /> : <Upload size={16} />}
              {uploading ? "Subiendo…" : "Confirmar y subir"}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal remisión glassmorphism ─────────────────────────────────────── */}
      {remisionModal && (
        <RemisionModal
          etapa={remisionModal.etapa}
          step={remisionModal.step}
          items={inventarioItems}
          rems={remisionModal.etapa === "salida" ? remSalida : remRetorno}
          bodegas={bodegas}
          venues={venues}
          blockBodegaId={remisionModal.etapa === "salida" ? salidaBodegaId : retornoBodegaId}
          blockVenueId={remisionModal.etapa === "salida" ? salidaVenueId : null}
          onBlockBodegaChange={bid => updateBlockBodega(remisionModal.etapa, bid)}
          onBlockVenueChange={vid => updateBlockVenue(vid)}
          onChange={updateRem}
          savedId={savedRem}
          fotoUrl={remisionModal.etapa === "salida" ? remFotos.salida : remFotos.retorno}
          uploadingFoto={uploadingRemFoto === remisionModal.etapa}
          onFotoSelect={file => subirFotoRemision(remisionModal.etapa, file)}
          onStepChange={s => setRemisionModal({ ...remisionModal, step: s })}
          onClose={() => setRemisionModal(null)}
        />
      )}
    </div>
  );
}

// ─── TimelineRow wrapper ──────────────────────────────────────────────────────

function TimelineRow({ done, stepNumber, isFormulario, children }: {
  done: boolean;
  stepNumber?: number;
  isFormulario?: boolean;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-start">
      {/* Dot */}
      <div className="shrink-0 relative z-10 mt-3.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all"
          style={done
            ? { background: "#10b981", borderColor: "#10b981" }
            : isFormulario
            ? { background: "hsl(33 100% 96%)", borderColor: "hsl(24 95% 53%)" }
            : { background: "white", borderColor: "hsl(220 13% 88%)" }
          }
        >
          {done
            ? <CheckCircle2 size={14} color="white" />
            : isFormulario
            ? <PackageOpen size={13} style={{ color: "hsl(24 95% 53%)" }} />
            : <span className="text-[11px] font-bold" style={{ color: "hsl(220 9% 46%)" }}>{stepNumber}</span>
          }
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── CheckpointCard ──────────────────────────────────────────────────────────

function CheckpointCard({ cp, onFotoSelect, onValorChange }: {
  cp: Checkpoint;
  idx?: number;
  onFotoSelect: (cpId: string, file: File) => void;
  onValorChange: (cpId: string, valor: any) => void;
  accentColor?: string;
}) {
  const done = completoCheckpoint(cp);
  const [open, setOpen] = useState(!done);
  const [localVal, setLocalVal] = useState<any>(cp.valor ?? (cp.tipo_bloque === "checkbox" ? false : ""));

  function handleChange(val: any) {
    setLocalVal(val);
    onValorChange(cp.id, val);
  }

  return (
    <div className="card-crm overflow-hidden transition-all" style={done ? { borderColor: "#d1fae5" } : {}}>
      {/* Step header — always visible, toggles body */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-start gap-3 p-4 focus:outline-none"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: done ? "#065f46" : "hsl(222 47% 11%)" }}>{cp.nombre}</p>
          {cp.descripcion && !open && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(218 11% 65%)" }}>{cp.descripcion}</p>
          )}
          {cp.hora_recordatorio && (
            <p className="flex items-center gap-1 text-[10px] mt-1" style={{ color: "hsl(218 11% 65%)" }}>
              <Clock size={9} />{formatTs(cp.hora_recordatorio)}
            </p>
          )}
        </div>
        {done
          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "#d1fae5", color: "#065f46" }}>Listo</span>
          : open
          ? <ChevronUp size={15} style={{ color: "hsl(218 11% 65%)" }} className="shrink-0 mt-0.5" />
          : <ChevronDown size={15} style={{ color: "hsl(218 11% 65%)" }} className="shrink-0 mt-0.5" />
        }
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t" style={{ borderColor: "hsl(220 13% 95%)" }}>
          {cp.descripcion && (
            <p className="text-xs pt-3" style={{ color: "hsl(220 9% 46%)" }}>{cp.descripcion}</p>
          )}

          {cp.tipo_bloque === "foto" && (
            <>
              {cp.fotos.length > 0 && (
                <div className="space-y-2 pt-3">
                  {cp.fotos.map(f => (
                    <div key={f.id} className="rounded-xl overflow-hidden border" style={{ borderColor: "hsl(220 13% 91%)" }}>
                      <img src={f.foto_url} alt={cp.nombre} className="w-full max-h-64 object-cover" />
                      {f.mensaje && <p className="text-xs px-3 py-2" style={{ color: "hsl(220 9% 46%)" }}>{f.mensaje}</p>}
                      <p className="text-[10px] px-3 pb-2" style={{ color: "hsl(218 11% 65%)" }}>{formatTs(f.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" id={`file-${cp.id}`}
                onChange={e => { const f = e.target.files?.[0]; if (f) onFotoSelect(cp.id, f); e.target.value = ""; }} />
              <label htmlFor={`file-${cp.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors focus:outline-none"
                style={done
                  ? { background: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0" }
                  : { background: "hsl(222 47% 11%)", color: "white" }
                }>
                <Camera size={15} />{done ? "Añadir otra foto" : "Subir foto"}
              </label>
            </>
          )}

          {cp.tipo_bloque === "texto" && (
            <textarea
              value={localVal}
              onChange={e => handleChange(e.target.value)}
              placeholder={cp.requerido ? "Respuesta obligatoria…" : "Respuesta opcional…"}
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none transition-colors"
              style={{ border: "1px solid hsl(220 13% 91%)", background: done ? "#f0fdf4" : "hsl(220 13% 97%)", color: "hsl(222 47% 11%)" }}
            />
          )}

          {cp.tipo_bloque === "numero" && (
            <input
              type="number"
              value={localVal}
              onChange={e => handleChange(e.target.value === "" ? null : Number(e.target.value))}
              placeholder={cp.requerido ? "Valor obligatorio…" : "Valor opcional…"}
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: "1px solid hsl(220 13% 91%)", background: done ? "#f0fdf4" : "hsl(220 13% 97%)", color: "hsl(222 47% 11%)" }}
            />
          )}

          {cp.tipo_bloque === "select" && (
            <select
              value={localVal}
              onChange={e => handleChange(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: "1px solid hsl(220 13% 91%)", background: done ? "#f0fdf4" : "white", color: "hsl(222 47% 11%)" }}
            >
              <option value="">{cp.requerido ? "Selecciona una opción…" : "— opcional —"}</option>
              {(cp.opciones || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {cp.tipo_bloque === "checkbox" && (
            <label
              className="flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3.5 transition-colors"
              style={{ background: localVal ? "#f0fdf4" : "hsl(220 13% 97%)", border: `1px solid ${localVal ? "#a7f3d0" : "hsl(220 13% 91%)"}` }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all cursor-pointer"
                style={{ background: localVal ? "#10b981" : "white", border: `2px solid ${localVal ? "#10b981" : "hsl(218 11% 65%)"}` }}
                onClick={() => handleChange(!localVal)}
              >
                {localVal && <Check size={12} color="white" />}
              </div>
              <span className="text-sm font-medium" style={{ color: localVal ? "#065f46" : "hsl(222 47% 11%)" }}>
                {localVal ? "Confirmado ✓" : "Marcar como completado"}
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RemisionCard (compact summary row in timeline) ──────────────────────────

function RemisionCard({ etapa, ok, filledCount, totalCount, bodegaName, venueName, fotoUrl, onOpen }: {
  etapa: "salida" | "retorno";
  ok: boolean;
  filledCount: number;
  totalCount: number;
  bodegaName?: string;
  venueName?: string;
  fotoUrl?: string;
  onOpen: () => void;
}) {
  const label = etapa === "salida" ? "Salida de bodega" : "Retorno a bodega";
  const Icon = etapa === "salida" ? PackageOpen : PackageCheck;
  return (
    <div
      className="card-crm overflow-hidden cursor-pointer transition-all"
      style={ok ? { borderColor: "#a7f3d0" } : {}}
      onClick={onOpen}
    >
      {ok && <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{
            background: ok ? "#d1fae5" : "hsl(33 100% 96%)",
          }}>
            <Icon size={16} style={{ color: ok ? "#059669" : "hsl(24 95% 53%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: ok ? "#065f46" : "hsl(222 47% 11%)" }}>{label}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {bodegaName && (
                <span className="text-[10px]" style={{ color: "hsl(218 11% 65%)" }}>{bodegaName}</span>
              )}
              {venueName && (
                <span className="text-[10px]" style={{ color: "hsl(218 11% 65%)" }}>· {venueName}</span>
              )}
              {totalCount > 0 && (
                <span className="text-[10px]" style={{ color: ok ? "#059669" : "hsl(218 11% 65%)" }}>
                  {filledCount}/{totalCount} items
                </span>
              )}
            </div>
            {totalCount > 0 && (
              <div className="mt-1.5 w-full h-1 rounded-full overflow-hidden" style={{ background: "hsl(220 13% 91%)" }}>
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%`, background: ok ? "#10b981" : "hsl(24 95% 53%)" }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {fotoUrl && <img src={fotoUrl} alt="" className="w-7 h-7 rounded-lg object-cover border border-slate-100" />}
            {ok
              ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#d1fae5", color: "#065f46" }}>Listo</span>
              : <span className="text-[10px] font-semibold px-2.5 py-1 rounded-xl" style={{ background: "hsl(222 47% 11%)", color: "white" }}>Abrir →</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RemisionModal (glassmorphism step-by-step popup) ────────────────────────

function RemisionModal({ etapa, step, items, rems, bodegas, venues, blockBodegaId, blockVenueId, onBlockBodegaChange, onBlockVenueChange, onChange, savedId, fotoUrl, uploadingFoto, onFotoSelect, onStepChange, onClose }: {
  etapa: "salida" | "retorno";
  step: number;
  items: InventarioItem[];
  rems: Record<string, Remision>;
  bodegas: Bodega[];
  venues: Venue[];
  blockBodegaId: string | null;
  blockVenueId: string | null;
  onBlockBodegaChange: (id: string | null) => void;
  onBlockVenueChange: (id: string | null) => void;
  onChange: (etapa: "salida" | "retorno", itemId: string, patch: Partial<Remision>) => void;
  savedId: string | null;
  fotoUrl?: string;
  uploadingFoto: boolean;
  onFotoSelect: (file: File) => void;
  onStepChange: (step: number) => void;
  onClose: () => void;
}) {
  const isSalida = etapa === "salida";
  const label = isSalida ? "Salida de bodega" : "Retorno a bodega";
  const totalSteps = 1 + items.length; // step 0 = context, steps 1..N = items
  const isLastStep = step === totalSteps - 1 || (items.length === 0 && step === 0);

  const currentItem = step >= 1 ? items[step - 1] : null;
  const currentRem = currentItem
    ? (rems[currentItem.id] ?? { item_id: currentItem.id, cantidad: null, estado: null, bodega_id: null, venue_id: null, novedad: null })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
      style={{ background: "rgba(10,12,20,0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-slide-up"
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isSalida
                ? <PackageOpen size={16} style={{ color: "hsl(24 95% 53%)" }} />
                : <PackageCheck size={16} style={{ color: "#059669" }} />
              }
              <span className="font-bold text-sm" style={{ color: "hsl(222 47% 11%)" }}>{label}</span>
            </div>
            <button onClick={onClose} style={{ color: "hsl(218 11% 65%)" }} className="hover:opacity-70 transition-opacity">
              <X size={18} />
            </button>
          </div>
          {/* Step progress bar */}
          {totalSteps > 1 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold" style={{ color: "hsl(218 11% 65%)" }}>
                  {step === 0 ? "Configuración" : `Item ${step} de ${items.length}`}
                </span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: "hsl(222 47% 11%)" }}>{step + 1}/{totalSteps}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220 13% 91%)" }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-400"
                  style={{
                    width: `${((step + 1) / totalSteps) * 100}%`,
                    background: isSalida ? "hsl(24 95% 53%)" : "#10b981"
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-5 pb-4 min-h-[200px]">
          {step === 0 && (
            <div className="space-y-3">
              {/* Bodega selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(218 11% 65%)" }}>
                  Bodega
                </label>
                <select
                  value={blockBodegaId ?? ""}
                  onChange={e => onBlockBodegaChange(e.target.value || null)}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none"
                  style={{ border: "1.5px solid hsl(220 13% 88%)", background: blockBodegaId ? "hsl(220 13% 97%)" : "white", color: "hsl(222 47% 11%)" }}
                >
                  <option value="">Seleccionar bodega…</option>
                  {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              {/* Venue selector (salida only) */}
              {isSalida && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(218 11% 65%)" }}>
                    Venue
                  </label>
                  <select
                    value={blockVenueId ?? ""}
                    onChange={e => onBlockVenueChange(e.target.value || null)}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none"
                    style={{ border: "1.5px solid hsl(220 13% 88%)", background: blockVenueId ? "hsl(220 13% 97%)" : "white", color: "hsl(222 47% 11%)" }}
                  >
                    <option value="">Seleccionar venue…</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                  </select>
                </div>
              )}
              {/* Foto */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(218 11% 65%)" }}>
                  Foto de remisión
                </label>
                {fotoUrl ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={fotoUrl} alt="Foto remisión" className="w-full h-28 object-cover" />
                    <label
                      htmlFor={`rem-foto-modal-${etapa}`}
                      className="absolute bottom-2 right-2 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                      style={{ background: "rgba(0,0,0,0.65)" }}
                    >
                      <Camera size={11} /> Cambiar
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor={`rem-foto-modal-${etapa}`}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl cursor-pointer transition-colors"
                    style={{ border: "2px dashed hsl(220 13% 85%)", color: "hsl(218 11% 65%)", background: "hsl(220 13% 97%)" }}
                  >
                    {uploadingFoto
                      ? <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                      : <><ImageIcon size={16} /> <span className="text-xs font-medium">Añadir foto de remisión</span></>
                    }
                  </label>
                )}
                <input id={`rem-foto-modal-${etapa}`} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onFotoSelect(f); e.target.value = ""; }} />
              </div>
            </div>
          )}

          {step >= 1 && currentItem && currentRem && (
            <div className="space-y-3 pt-1">
              {/* Item header */}
              <div className="flex items-center gap-2.5 py-2 px-3 rounded-2xl" style={{ background: "hsl(220 13% 96%)" }}>
                <span className="text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "hsl(220 13% 88%)", color: "hsl(220 9% 46%)" }}>
                  {currentItem.numero}
                </span>
                <p className="font-semibold text-sm" style={{ color: "hsl(222 47% 11%)" }}>{currentItem.nombre}</p>
                {savedId === currentItem.id && <Check size={14} color="#10b981" className="shrink-0 ml-auto" />}
              </div>
              {/* Cantidad */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(218 11% 65%)" }}>
                  Cantidad
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={currentRem.cantidad ?? ""}
                  onChange={e => onChange(etapa, currentItem.id, { cantidad: e.target.value === "" ? null : Number(e.target.value) })}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none"
                  style={{ border: "1.5px solid hsl(220 13% 88%)", background: "hsl(220 13% 97%)", color: "hsl(222 47% 11%)" }}
                />
              </div>
              {/* Estado */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(218 11% 65%)" }}>
                  Estado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ESTADOS.map(s => (
                    <button
                      key={s}
                      onClick={() => onChange(etapa, currentItem.id, { estado: s })}
                      className="py-2.5 rounded-2xl text-xs font-semibold transition-all focus:outline-none"
                      style={currentRem.estado === s
                        ? { background: "hsl(222 47% 11%)", color: "white", border: "1.5px solid hsl(222 47% 11%)" }
                        : { background: "white", color: "hsl(220 9% 46%)", border: "1.5px solid hsl(220 13% 88%)" }
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Novedad (retorno only) */}
              {!isSalida && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(218 11% 65%)" }}>
                    Novedad / observación
                  </label>
                  <textarea
                    placeholder="Ej: llegó dañado…"
                    value={currentRem.novedad ?? ""}
                    onChange={e => onChange(etapa, currentItem.id, { novedad: e.target.value })}
                    rows={2}
                    className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none"
                    style={{ border: "1.5px solid hsl(220 13% 88%)", background: "hsl(220 13% 97%)", color: "hsl(222 47% 11%)" }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-5 pb-5 flex gap-2.5" style={{ borderTop: "1px solid hsl(220 13% 95%)", paddingTop: "14px" }}>
          {step > 0 && (
            <button
              onClick={() => onStepChange(step - 1)}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors focus:outline-none"
              style={{ background: "hsl(220 13% 95%)", color: "hsl(222 47% 11%)" }}
            >
              ← Anterior
            </button>
          )}
          {isLastStep ? (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-colors focus:outline-none flex items-center justify-center gap-2"
              style={{ background: isSalida ? "hsl(24 95% 53%)" : "#10b981" }}
            >
              <CheckCircle2 size={16} /> Finalizar
            </button>
          ) : (
            <button
              onClick={() => onStepChange(step + 1)}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-colors focus:outline-none"
              style={{ background: "hsl(222 47% 11%)" }}
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
