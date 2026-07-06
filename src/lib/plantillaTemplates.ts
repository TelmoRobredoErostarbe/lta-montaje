export type ExperienciaType = "CDL" | "TJR" | "TJE" | "BOL";
export type CDLVariant = "A" | "B";
export type PasoTipo = "base" | "segundo_show" | "desmontaje";

export interface PasoPlantilla {
  nombre: string;
  offset_minutos: number;
  referencia_show: "show1";
  tipo: PasoTipo;
}

// ── Detección desde código de evento ──────────────────────────────────────────

export function detectExperiencia(codigo: string): { tipo: ExperienciaType | null; cdlVariant: CDLVariant } {
  const up = codigo.toUpperCase();
  let tipo: ExperienciaType | null = null;
  if (up.startsWith("CDL")) tipo = "CDL";
  else if (up.startsWith("TJR")) tipo = "TJR";
  else if (up.startsWith("TJE")) tipo = "TJE";
  else if (up.startsWith("BOL")) tipo = "BOL";

  // CDL-DDMMYYYY-SD-CIUDAD  →  SD last digit = día en serie (1 = CDL A, >1 = CDL B)
  let cdlVariant: CDLVariant = "A";
  if (tipo === "CDL") {
    const parts = codigo.split("-");
    if (parts.length >= 3) {
      const sd = parts[2];
      const dia = parseInt(sd.slice(-1), 10);
      cdlVariant = dia === 1 ? "A" : "B";
    }
  }
  return { tipo, cdlVariant };
}

// ── CDL A base (relativo al primer show) ──────────────────────────────────────

const CDL_A_BASE: PasoPlantilla[] = [
  { nombre: "Cargue de camión",  offset_minutos: -420, referencia_show: "show1", tipo: "base" },
  { nombre: "Llegada a venue",   offset_minutos: -360, referencia_show: "show1", tipo: "base" },
  { nombre: "Montaje",           offset_minutos: -300, referencia_show: "show1", tipo: "base" },
  { nombre: "Tarima lista",      offset_minutos: -180, referencia_show: "show1", tipo: "base" },
  { nombre: "Prueba de sonido",  offset_minutos: -120, referencia_show: "show1", tipo: "base" },
  { nombre: "Recinto listo",     offset_minutos:  -60, referencia_show: "show1", tipo: "base" },
  { nombre: "Apertura puertas",  offset_minutos:  -45, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer llamado",    offset_minutos:  -15, referencia_show: "show1", tipo: "base" },
  { nombre: "Segundo llamado",   offset_minutos:   -5, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer show",       offset_minutos:    0, referencia_show: "show1", tipo: "base" },
  { nombre: "Tercer llamado",    offset_minutos:    5, referencia_show: "show1", tipo: "base" },
  { nombre: "Cierre puertas",    offset_minutos:   10, referencia_show: "show1", tipo: "base" },
  { nombre: "Salida público",    offset_minutos:   75, referencia_show: "show1", tipo: "base" },
];

// ── CDL B base ────────────────────────────────────────────────────────────────

const CDL_B_BASE: PasoPlantilla[] = [
  { nombre: "Llegada a venue",  offset_minutos: -120, referencia_show: "show1", tipo: "base" },
  { nombre: "Prueba de sonido", offset_minutos:  -90, referencia_show: "show1", tipo: "base" },
  { nombre: "Recinto listo",    offset_minutos:  -60, referencia_show: "show1", tipo: "base" },
  { nombre: "Apertura puertas", offset_minutos:  -45, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer llamado",   offset_minutos:  -15, referencia_show: "show1", tipo: "base" },
  { nombre: "Segundo llamado",  offset_minutos:   -5, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer show",      offset_minutos:    0, referencia_show: "show1", tipo: "base" },
  { nombre: "Tercer llamado",   offset_minutos:    5, referencia_show: "show1", tipo: "base" },
  { nombre: "Cierre puertas",   offset_minutos:   10, referencia_show: "show1", tipo: "base" },
  { nombre: "Salida público",   offset_minutos:   75, referencia_show: "show1", tipo: "base" },
];

// ── CDL segundo show (3 variantes indexadas 0/1/2) ───────────────────────────

export const CDL_SEGUNDO_SHOW_OFFSETS = [120, 135, 150] as const; // minutos desde primer show

export const CDL_SEGUNDO_SHOW_OPTIONS: PasoPlantilla[][] = [
  // 0: +2h (120 min)
  [
    { nombre: "Apertura puertas", offset_minutos:  90, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Primer llamado",   offset_minutos: 105, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Segundo llamado",  offset_minutos: 115, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Segundo show",     offset_minutos: 120, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Tercer llamado",   offset_minutos: 125, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Cierre puertas",   offset_minutos: 130, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Salida público",   offset_minutos: 195, referencia_show: "show1", tipo: "segundo_show" },
  ],
  // 1: +2h15 (135 min)
  [
    { nombre: "Apertura puertas", offset_minutos: 105, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Primer llamado",   offset_minutos: 120, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Segundo llamado",  offset_minutos: 130, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Segundo show",     offset_minutos: 135, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Tercer llamado",   offset_minutos: 140, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Cierre puertas",   offset_minutos: 145, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Salida público",   offset_minutos: 210, referencia_show: "show1", tipo: "segundo_show" },
  ],
  // 2: +2h30 (150 min)
  [
    { nombre: "Apertura puertas", offset_minutos: 120, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Primer llamado",   offset_minutos: 135, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Segundo llamado",  offset_minutos: 145, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Segundo show",     offset_minutos: 150, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Tercer llamado",   offset_minutos: 155, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Cierre puertas",   offset_minutos: 160, referencia_show: "show1", tipo: "segundo_show" },
    { nombre: "Salida público",   offset_minutos: 225, referencia_show: "show1", tipo: "segundo_show" },
  ],
];

// CDL desmontaje (varía según variante de segundo show; -1 = sin segundo show)
const CDL_DESMONTAJE: Record<number, PasoPlantilla[]> = {
  [-1]: [
    { nombre: "Desmontaje",      offset_minutos:  90, referencia_show: "show1", tipo: "desmontaje" },
    { nombre: "Cargue al camión", offset_minutos: 210, referencia_show: "show1", tipo: "desmontaje" },
    { nombre: "Llegada a bodega", offset_minutos: 270, referencia_show: "show1", tipo: "desmontaje" },
  ],
  [0]: [
    { nombre: "Desmontaje",       offset_minutos: 210, referencia_show: "show1", tipo: "desmontaje" },
    { nombre: "Cargue al camión", offset_minutos: 330, referencia_show: "show1", tipo: "desmontaje" },
    { nombre: "Llegada a bodega", offset_minutos: 390, referencia_show: "show1", tipo: "desmontaje" },
  ],
  [1]: [
    { nombre: "Desmontaje",       offset_minutos: 225, referencia_show: "show1", tipo: "desmontaje" },
    { nombre: "Cargue al camión", offset_minutos: 345, referencia_show: "show1", tipo: "desmontaje" },
    { nombre: "Llegada a bodega", offset_minutos: 405, referencia_show: "show1", tipo: "desmontaje" },
  ],
  [2]: [
    { nombre: "Desmontaje",       offset_minutos: 240, referencia_show: "show1", tipo: "desmontaje" },
    { nombre: "Cargue al camión", offset_minutos: 360, referencia_show: "show1", tipo: "desmontaje" },
    { nombre: "Llegada a bodega", offset_minutos: 420, referencia_show: "show1", tipo: "desmontaje" },
  ],
};

// ── TJR ───────────────────────────────────────────────────────────────────────

const TJR_BASE: PasoPlantilla[] = [
  { nombre: "Cargue de camión", offset_minutos: -300, referencia_show: "show1", tipo: "base" },
  { nombre: "Llegada a venue",  offset_minutos: -240, referencia_show: "show1", tipo: "base" },
  { nombre: "Prueba de sonido", offset_minutos: -180, referencia_show: "show1", tipo: "base" },
  { nombre: "Recinto listo",    offset_minutos:  -60, referencia_show: "show1", tipo: "base" },
  { nombre: "Apertura puertas", offset_minutos:  -45, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer llamado",   offset_minutos:  -15, referencia_show: "show1", tipo: "base" },
  { nombre: "Segundo llamado",  offset_minutos:   -5, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer show",      offset_minutos:    0, referencia_show: "show1", tipo: "base" },
  { nombre: "Tercer llamado",   offset_minutos:    5, referencia_show: "show1", tipo: "base" },
  { nombre: "Cierre puertas",   offset_minutos:   10, referencia_show: "show1", tipo: "base" },
  { nombre: "Fin de show",      offset_minutos:   90, referencia_show: "show1", tipo: "base" },
];

const TJR_SEGUNDO_SHOW: PasoPlantilla[] = [
  { nombre: "Apertura puertas", offset_minutos: 135, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Primer llamado",   offset_minutos: 165, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Segundo llamado",  offset_minutos: 175, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Segundo show",     offset_minutos: 180, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Tercer llamado",   offset_minutos: 185, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Cierre puertas",   offset_minutos: 190, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Salida público",   offset_minutos: 270, referencia_show: "show1", tipo: "segundo_show" },
];

const TJR_DESMONTAJE_SIN: PasoPlantilla[] = [
  { nombre: "Desmontaje",       offset_minutos: 105, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Cargue al camión", offset_minutos: 225, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Llegada a bodega", offset_minutos: 285, referencia_show: "show1", tipo: "desmontaje" },
];

const TJR_DESMONTAJE_CON: PasoPlantilla[] = [
  { nombre: "Desmontaje",       offset_minutos: 300, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Cargue al camión", offset_minutos: 330, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Llegada a bodega", offset_minutos: 390, referencia_show: "show1", tipo: "desmontaje" },
];

// ── TJE (siempre 2 shows, sin opción de segundo show) ────────────────────────

const TJE_FULL: PasoPlantilla[] = [
  { nombre: "Cargue de camión",  offset_minutos: -540, referencia_show: "show1", tipo: "base" },
  { nombre: "Llegada a venue",   offset_minutos: -480, referencia_show: "show1", tipo: "base" },
  { nombre: "Montaje técnico",   offset_minutos: -300, referencia_show: "show1", tipo: "base" },
  { nombre: "Ensayo",            offset_minutos: -180, referencia_show: "show1", tipo: "base" },
  { nombre: "Recinto listo",     offset_minutos:  -60, referencia_show: "show1", tipo: "base" },
  { nombre: "Ingreso a Lobby",   offset_minutos:  -45, referencia_show: "show1", tipo: "base" },
  { nombre: "Ingreso a teatro",  offset_minutos:  -15, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer llamado",    offset_minutos:  -15, referencia_show: "show1", tipo: "base" },
  { nombre: "Segundo llamado",   offset_minutos:   -5, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer show",       offset_minutos:    0, referencia_show: "show1", tipo: "base" },
  { nombre: "Tercer llamado",    offset_minutos:    5, referencia_show: "show1", tipo: "base" },
  { nombre: "Cierre puertas",    offset_minutos:   10, referencia_show: "show1", tipo: "base" },
  { nombre: "Fin de show",       offset_minutos:   90, referencia_show: "show1", tipo: "base" },
  { nombre: "Fotos",             offset_minutos:  105, referencia_show: "show1", tipo: "base" },
  { nombre: "Ingreso a Lobby",   offset_minutos:  120, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Ingreso a teatro",  offset_minutos:  135, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Primer llamado",    offset_minutos:  135, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Segundo llamado",   offset_minutos:  145, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Segundo show",      offset_minutos:  150, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Tercer llamado",    offset_minutos:  155, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Cierre puertas",    offset_minutos:  160, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Salida público",    offset_minutos:  240, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Fotos",             offset_minutos:  255, referencia_show: "show1", tipo: "segundo_show" },
];

const TJE_DESMONTAJE: PasoPlantilla[] = [
  { nombre: "Desmontaje",       offset_minutos: 270, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Cargue al camión", offset_minutos: 300, referencia_show: "show1", tipo: "desmontaje" },
];

// ── BOL (siempre 2 shows, sin opción de segundo show) ────────────────────────

const BOL_FULL: PasoPlantilla[] = [
  { nombre: "Cargue de camión",  offset_minutos: -540, referencia_show: "show1", tipo: "base" },
  { nombre: "Llegada a venue",   offset_minutos: -480, referencia_show: "show1", tipo: "base" },
  { nombre: "Montaje técnico",   offset_minutos: -300, referencia_show: "show1", tipo: "base" },
  { nombre: "Ensayo",            offset_minutos: -180, referencia_show: "show1", tipo: "base" },
  { nombre: "Recinto listo",     offset_minutos:  -60, referencia_show: "show1", tipo: "base" },
  { nombre: "Ingreso a Lobby",   offset_minutos:  -45, referencia_show: "show1", tipo: "base" },
  { nombre: "Ingreso a teatro",  offset_minutos:  -15, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer llamado",    offset_minutos:  -15, referencia_show: "show1", tipo: "base" },
  { nombre: "Segundo llamado",   offset_minutos:   -5, referencia_show: "show1", tipo: "base" },
  { nombre: "Primer show",       offset_minutos:    0, referencia_show: "show1", tipo: "base" },
  { nombre: "Tercer llamado",    offset_minutos:    5, referencia_show: "show1", tipo: "base" },
  { nombre: "Cierre puertas",    offset_minutos:   10, referencia_show: "show1", tipo: "base" },
  { nombre: "Fin de show",       offset_minutos:   90, referencia_show: "show1", tipo: "base" },
  { nombre: "Fotos",             offset_minutos:  105, referencia_show: "show1", tipo: "base" },
  { nombre: "Ingreso a Lobby",   offset_minutos:  150, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Ingreso a teatro",  offset_minutos:  165, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Primer llamado",    offset_minutos:  165, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Segundo llamado",   offset_minutos:  175, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Segundo show",      offset_minutos:  180, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Tercer llamado",    offset_minutos:  185, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Cierre puertas",    offset_minutos:  190, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Salida público",    offset_minutos:  255, referencia_show: "show1", tipo: "segundo_show" },
  { nombre: "Fotos",             offset_minutos:  270, referencia_show: "show1", tipo: "segundo_show" },
];

const BOL_DESMONTAJE: PasoPlantilla[] = [
  { nombre: "Desmontaje",       offset_minutos: 300, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Cargue al camión", offset_minutos: 330, referencia_show: "show1", tipo: "desmontaje" },
];

// ── Builder final ─────────────────────────────────────────────────────────────

export function buildPasos(
  tipo: ExperienciaType,
  cdlVariant: CDLVariant,
  segundoShow: boolean,
  segundoShowOption: number, // 0/1/2 para CDL; ignorado para TJR/TJE/BOL
  desmontaje: boolean,
): PasoPlantilla[] {
  const ps: PasoPlantilla[] = [];

  if (tipo === "CDL") {
    ps.push(...(cdlVariant === "A" ? CDL_A_BASE : CDL_B_BASE));
    if (segundoShow) ps.push(...CDL_SEGUNDO_SHOW_OPTIONS[segundoShowOption]);
    if (desmontaje) ps.push(...(CDL_DESMONTAJE[segundoShow ? segundoShowOption : -1] ?? CDL_DESMONTAJE[0]));
  } else if (tipo === "TJR") {
    ps.push(...TJR_BASE);
    if (segundoShow) ps.push(...TJR_SEGUNDO_SHOW);
    if (desmontaje) ps.push(...(segundoShow ? TJR_DESMONTAJE_CON : TJR_DESMONTAJE_SIN));
  } else if (tipo === "TJE") {
    ps.push(...TJE_FULL);
    if (desmontaje) ps.push(...TJE_DESMONTAJE);
  } else if (tipo === "BOL") {
    ps.push(...BOL_FULL);
    if (desmontaje) ps.push(...BOL_DESMONTAJE);
  }

  return ps.map((p, i) => ({ ...p, orden: i + 1 })) as (PasoPlantilla & { orden: number })[];
}
