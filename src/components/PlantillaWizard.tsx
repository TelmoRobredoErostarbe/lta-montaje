import { useState, useEffect } from "react";
import { X, ChevronRight, Check, Sparkles, Music2, Wrench, Clock } from "lucide-react";
import {
  detectExperiencia, buildPasos, CDL_SEGUNDO_SHOW_OFFSETS,
  type ExperienciaType, type PasoPlantilla,
} from "@/lib/plantillaTemplates";

// ── helpers ───────────────────────────────────────────────────────────────────

function addMins(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60).toString().padStart(2, "0");
  const mm = (((total % 1440) + 1440) % 1440 % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatOffset(mins: number): string {
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = mins < 0 ? "−" : "+";
  if (h === 0) return `${sign}${m} min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

const TIPO_LABELS: Record<ExperienciaType, string> = {
  CDL: "Candlelight",
  TJR: "The Jazz Room",
  TJE: "The Jury Experience",
  BOL: "Ballet of Lights",
};

const TIPO_COLORS: Record<ExperienciaType, { bg: string; text: string; border: string; dot: string }> = {
  CDL:  { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200", dot: "bg-amber-400"  },
  TJR:  { bg: "bg-violet-50",  text: "text-violet-700", border: "border-violet-200",dot: "bg-violet-400" },
  TJE:  { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200",  dot: "bg-blue-400"   },
  BOL:  { bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200",dot:"bg-emerald-400"},
};

const PASO_TIPO_STYLE: Record<string, { bar: string; dot: string; label: string; labelColor: string }> = {
  base:         { bar: "bg-slate-200",  dot: "bg-slate-400",  label: "Base",        labelColor: "text-slate-500" },
  segundo_show: { bar: "bg-green-200",  dot: "bg-green-500",  label: "2º show",     labelColor: "text-green-700" },
  desmontaje:   { bar: "bg-red-200",    dot: "bg-red-400",    label: "Desmontaje",  labelColor: "text-red-600"   },
};

// ── tipos internos ────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  evento: {
    id: string;
    codigo: string;
    fecha: string;
    hora_inicio_show: string | null;
    hora_segundo_show: string | null;
  };
  onApply: (pasos: PasoPlantilla[]) => Promise<void>;
}

type Step = "intro" | "segundo_show" | "hora_segundo_show" | "desmontaje" | "preview";

// ── componente ────────────────────────────────────────────────────────────────

export function PlantillaWizard({ open, onClose, evento, onApply }: Props) {
  const { tipo, cdlVariant } = detectExperiencia(evento.codigo);

  const [step, setStep] = useState<Step>("intro");
  const [dir, setDir] = useState<1 | -1>(1); // 1=adelante -1=atrás
  const [animating, setAnimating] = useState(false);
  const [segundoShow, setSegundoShow] = useState<boolean | null>(null);
  const [showOption, setShowOption] = useState<number | null>(null);
  const [desmontaje, setDesmontaje] = useState<boolean | null>(null);
  const [applying, setApplying] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep("intro");
      setDir(1);
      setSegundoShow(null);
      setShowOption(null);
      setDesmontaje(null);
      setApplying(false);
    }
  }, [open]);

  if (!open || !tipo) return null;

  const primerShowTime = evento.hora_inicio_show?.slice(0, 5) ?? "18:00";
  const c = TIPO_COLORS[tipo];

  // ── navegación animada ───────────────────────────────────────────────────

  function goTo(next: Step, direction: 1 | -1 = 1) {
    if (animating) return;
    setDir(direction);
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  }

  function nextFromIntro() {
    if (tipo === "CDL" || tipo === "TJR") goTo("segundo_show");
    else goTo("desmontaje");
  }

  function nextFromSegundoShow(val: boolean) {
    setSegundoShow(val);
    if (val && tipo === "CDL") goTo("hora_segundo_show");
    else {
      if (!val) setShowOption(null);
      goTo("desmontaje");
    }
  }

  function nextFromHora(idx: number) {
    setShowOption(idx);
    goTo("desmontaje");
  }

  function nextFromDesmontaje(val: boolean) {
    setDesmontaje(val);
    goTo("preview");
  }

  // ── pasos finales ────────────────────────────────────────────────────────

  const pasos: PasoPlantilla[] = step === "preview" || applying
    ? buildPasos(tipo, cdlVariant, segundoShow ?? false, showOption ?? 0, desmontaje ?? false)
    : [];

  async function handleApply() {
    setApplying(true);
    try { await onApply(pasos); onClose(); }
    finally { setApplying(false); }
  }

  // ── total steps para progress ────────────────────────────────────────────
  const allSteps: Step[] =
    tipo === "CDL" ? ["intro", "segundo_show", "hora_segundo_show", "desmontaje", "preview"] :
    tipo === "TJR" ? ["intro", "segundo_show", "desmontaje", "preview"] :
    ["intro", "desmontaje", "preview"];

  const currentIdx = allSteps.indexOf(step);

  // ── render ───────────────────────────────────────────────────────────────

  const slideClass = animating
    ? dir === 1
      ? "opacity-0 translate-x-6"
      : "opacity-0 -translate-x-6"
    : "opacity-100 translate-x-0";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Top bar */}
        <div className={`flex items-center justify-between px-5 pt-5 pb-4 ${c.bg} border-b ${c.border}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${c.dot} animate-pulse`} />
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest ${c.text}`}>{TIPO_LABELS[tipo]}</p>
              {tipo === "CDL" && (
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Variante {cdlVariant} · {cdlVariant === "A" ? "Primera fecha / única" : "Fecha de serie"}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 py-3 bg-slate-50 border-b border-slate-100">
          {allSteps.filter(s => s !== "hora_segundo_show" || (tipo === "CDL" && segundoShow)).map((s) => {
            const realIdx = allSteps.indexOf(s);
            const isActive = realIdx === currentIdx;
            const isDone = realIdx < currentIdx;
            return (
              <div key={s}
                className={`rounded-full transition-all duration-300 ${
                  isActive ? `w-6 h-2 ${c.dot}` :
                  isDone   ? `w-2 h-2 ${c.dot} opacity-60` :
                             "w-2 h-2 bg-slate-200"
                }`}
              />
            );
          })}
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto transition-all duration-220 ease-out ${slideClass}`}>

          {/* ── INTRO ─────────────────────────────────────────────── */}
          {step === "intro" && (
            <div className="px-6 py-8 flex flex-col items-center text-center gap-6">
              <div className={`w-20 h-20 rounded-3xl ${c.bg} border-2 ${c.border} flex items-center justify-center`}>
                <Sparkles size={36} className={c.text} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {tipo === "CDL" && `CDL ${cdlVariant}`}
                  {tipo !== "CDL" && TIPO_LABELS[tipo]}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {tipo === "CDL" && cdlVariant === "A" && "Primera fecha de la serie o evento único. Incluye cargue, montaje y tarima."}
                  {tipo === "CDL" && cdlVariant === "B" && "Fecha de continuación en serie. La logística ya está en destino."}
                  {tipo === "TJR" && "The Jazz Room con opción de segundo show y desmontaje."}
                  {tipo === "TJE" && "The Jury Experience. Siempre incluye dos shows."}
                  {tipo === "BOL" && "Ballet of Lights. Siempre incluye dos shows."}
                </p>
              </div>

              {/* Show time badge */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3">
                <Clock size={18} className="text-slate-400" />
                <div className="text-left">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Primer show</p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none mt-0.5">{primerShowTime}</p>
                </div>
              </div>

              <button
                onClick={nextFromIntro}
                className={`w-full py-3.5 rounded-2xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${c.dot.replace("bg-", "bg-")} shadow-lg`}
                style={{ background: tipo === "CDL" ? "#d97706" : tipo === "TJR" ? "#7c3aed" : tipo === "TJE" ? "#2563eb" : "#059669" }}
              >
                Configurar plantilla <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── SEGUNDO SHOW ──────────────────────────────────────── */}
          {step === "segundo_show" && (
            <div className="px-6 py-8 flex flex-col gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Music2 size={24} className="text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">¿Tiene segundo show?</h2>
                <p className="text-sm text-slate-400 mt-1">Bloque de continuación tras el primer show</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <YesNoCard label="Sí" emoji="🎶" accent="green" onClick={() => nextFromSegundoShow(true)} />
                <YesNoCard label="No" emoji="✗" accent="slate" onClick={() => nextFromSegundoShow(false)} />
              </div>
              <BackButton onClick={() => goTo("intro", -1)} />
            </div>
          )}

          {/* ── HORA SEGUNDO SHOW (CDL) ───────────────────────────── */}
          {step === "hora_segundo_show" && (
            <div className="px-6 py-8 flex flex-col gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">¿A qué hora es el segundo show?</h2>
                <p className="text-sm text-slate-400 mt-1">Esto determina el horario de los pasos</p>
              </div>
              <div className="flex flex-col gap-3">
                {CDL_SEGUNDO_SHOW_OFFSETS.map((offset, idx) => {
                  const hora = addMins(primerShowTime, offset);
                  const diffs = ["2h", "2h 15m", "2h 30m"];
                  return (
                    <button
                      key={idx}
                      onClick={() => nextFromHora(idx)}
                      className="flex items-center justify-between bg-white border-2 border-slate-200 hover:border-green-400 hover:bg-green-50 rounded-2xl px-5 py-4 transition-all active:scale-[.98] group"
                    >
                      <div className="text-left">
                        <p className="text-[11px] text-slate-400 font-medium">+{diffs[idx]} desde primer show</p>
                        <p className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">{hora}</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-green-500 flex items-center justify-center transition-colors">
                        <ChevronRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
              <BackButton onClick={() => goTo("segundo_show", -1)} />
            </div>
          )}

          {/* ── DESMONTAJE ────────────────────────────────────────── */}
          {step === "desmontaje" && (
            <div className="px-6 py-8 flex flex-col gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wrench size={24} className="text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">¿Tiene desmontaje?</h2>
                <p className="text-sm text-slate-400 mt-1">Incluye desmontaje, cargue al camión y bodega</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <YesNoCard label="Sí" emoji="🔧" accent="red" onClick={() => nextFromDesmontaje(true)} />
                <YesNoCard label="No" emoji="✗" accent="slate" onClick={() => nextFromDesmontaje(false)} />
              </div>
              <BackButton onClick={() => {
                if (tipo === "CDL" && segundoShow) goTo("hora_segundo_show", -1);
                else if (tipo === "CDL" || tipo === "TJR") goTo("segundo_show", -1);
                else goTo("intro", -1);
              }} />
            </div>
          )}

          {/* ── PREVIEW ───────────────────────────────────────────── */}
          {step === "preview" && (
            <div className="px-5 py-6 flex flex-col gap-5">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-slate-900">Resumen de la plantilla</h2>
                <p className="text-sm text-slate-400 mt-1">{pasos.length} pasos · todos calculados desde el primer show</p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 justify-center flex-wrap">
                {Object.entries(PASO_TIPO_STYLE).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <div className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
                    <span className={val.labelColor}>{val.label}</span>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-100" />

                <div className="space-y-1">
                  {pasos.map((p, idx) => {
                    const ts = PASO_TIPO_STYLE[p.tipo] ?? PASO_TIPO_STYLE.base;
                    const hora = addMins(primerShowTime, p.offset_minutos);
                    return (
                      <div key={idx} className="flex items-center gap-3 py-1.5">
                        {/* Dot */}
                        <div className={`w-[10px] h-[10px] rounded-full shrink-0 ml-[14px] z-10 border-2 border-white shadow-sm ${ts.dot}`} />
                        {/* Content */}
                        <div className="flex-1 flex items-center justify-between min-w-0 bg-slate-50 rounded-xl px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{p.nombre}</p>
                            <p className="text-[11px] text-slate-400">{formatOffset(p.offset_minutos)}</p>
                          </div>
                          <span className="text-sm font-bold tabular-nums text-slate-900 shrink-0 ml-2">{hora}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <BackButton onClick={() => goTo("desmontaje", -1)} />
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[.98] disabled:opacity-50"
                >
                  {applying ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Aplicando…</>
                  ) : (
                    <><Check size={16} /> Aplicar plantilla</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── sub-componentes ───────────────────────────────────────────────────────────

function YesNoCard({ label, emoji, accent, onClick }: {
  label: string; emoji: string; accent: "green" | "red" | "slate"; onClick: () => void;
}) {
  const styles = {
    green: "hover:border-green-400 hover:bg-green-50 active:bg-green-100",
    red:   "hover:border-red-400   hover:bg-red-50   active:bg-red-100",
    slate: "hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100",
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 py-7 rounded-2xl border-2 border-slate-200 transition-all active:scale-[.97] ${styles[accent]}`}
    >
      <span className="text-3xl leading-none">{emoji}</span>
      <span className="text-sm font-bold text-slate-800">{label}</span>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors mx-auto block"
    >
      ← Volver
    </button>
  );
}
