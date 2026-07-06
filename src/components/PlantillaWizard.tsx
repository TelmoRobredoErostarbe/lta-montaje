import { useState, useEffect } from "react";
import { X, ChevronRight, Check, Sparkles, Clock } from "lucide-react";
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

const PASO_TIPO_STYLE: Record<string, { dot: string; labelColor: string }> = {
  base:         { dot: "bg-slate-400",  labelColor: "text-slate-500" },
  segundo_show: { dot: "bg-green-500",  labelColor: "text-green-700" },
  desmontaje:   { dot: "bg-red-400",    labelColor: "text-red-600"   },
};

// ── tipos ─────────────────────────────────────────────────────────────────────

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

// ── componente ────────────────────────────────────────────────────────────────

export function PlantillaWizard({ open, onClose, evento, onApply }: Props) {
  const { tipo, cdlVariant } = detectExperiencia(evento.codigo);

  const [step, setStep] = useState<"intro" | "preview">("intro");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("intro");
      setApplying(false);
    }
  }, [open]);

  if (!open || !tipo) return null;

  const primerShowTime = evento.hora_inicio_show?.slice(0, 5) ?? "18:00";
  const c = TIPO_COLORS[tipo];

  // Solo pasos base (sin segundo show, sin desmontaje)
  const pasos: PasoPlantilla[] = buildPasos(tipo, cdlVariant, false, 0, false);

  async function handleApply() {
    setApplying(true);
    try { await onApply(pasos); onClose(); }
    finally { setApplying(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
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
          {(["intro", "preview"] as const).map((s) => (
            <div key={s} className={`rounded-full transition-all duration-300 ${
              s === step ? `w-6 h-2 ${c.dot}` :
              s === "intro" && step === "preview" ? `w-2 h-2 ${c.dot} opacity-60` :
              "w-2 h-2 bg-slate-200"
            }`} />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── INTRO ───────────────────────────────────────────────── */}
          {step === "intro" && (
            <div className="px-6 py-8 flex flex-col items-center text-center gap-6">
              <div className={`w-20 h-20 rounded-3xl ${c.bg} border-2 ${c.border} flex items-center justify-center`}>
                <Sparkles size={36} className={c.text} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {tipo === "CDL" ? `CDL ${cdlVariant}` : TIPO_LABELS[tipo]}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {tipo === "CDL" && cdlVariant === "A" && "Se aplicarán los pasos base. El coordinador gestionará el segundo show y desmontaje durante el evento."}
                  {tipo === "CDL" && cdlVariant === "B" && "Fecha de continuación en serie. Se aplicarán los pasos base."}
                  {tipo === "TJR" && "Se aplicarán los pasos base. El coordinador indicará si hay segundo show y desmontaje."}
                  {tipo === "TJE" && "Se aplicará la plantilla completa con ambos shows. El coordinador confirmará el desmontaje."}
                  {tipo === "BOL" && "Se aplicará la plantilla completa con ambos shows. El coordinador confirmará el desmontaje."}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3">
                <Clock size={18} className="text-slate-400" />
                <div className="text-left">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Primer show</p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none mt-0.5">{primerShowTime}</p>
                </div>
              </div>

              <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left">
                <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Esto reemplazará el checklist actual</p>
                <p className="text-xs text-amber-600">{pasos.length} pasos base · Las preguntas de segundo show y desmontaje las verá el coordinador durante el evento.</p>
              </div>

              <button
                onClick={() => setStep("preview")}
                className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                style={{ background: tipo === "CDL" ? "#d97706" : tipo === "TJR" ? "#7c3aed" : tipo === "TJE" ? "#2563eb" : "#059669" }}
              >
                Ver pasos <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── PREVIEW ─────────────────────────────────────────────── */}
          {step === "preview" && (
            <div className="px-5 py-6 flex flex-col gap-5">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-slate-900">Pasos base</h2>
                <p className="text-sm text-slate-400 mt-1">{pasos.length} pasos · calculados desde el primer show</p>
              </div>

              <div className="relative">
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-100" />
                <div className="space-y-1">
                  {pasos.map((p, idx) => {
                    const ts = PASO_TIPO_STYLE[p.tipo] ?? PASO_TIPO_STYLE.base;
                    const hora = addMins(primerShowTime, p.offset_minutos);
                    return (
                      <div key={idx} className="flex items-center gap-3 py-1.5">
                        <div className={`w-[10px] h-[10px] rounded-full shrink-0 ml-[14px] z-10 border-2 border-white shadow-sm ${ts.dot}`} />
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

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("intro")}
                  className="px-5 py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-sm transition-all active:scale-[.98]"
                >
                  ← Atrás
                </button>
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

// ── export helpers para usar en CoordEventoDetallePage ────────────────────────

export { addMins, CDL_SEGUNDO_SHOW_OFFSETS };
