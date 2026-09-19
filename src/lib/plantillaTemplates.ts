export type ExperienciaType = "CDL" | "TJR" | "TJE" | "BOL" | "IGW";
export type CDLVariant = "A" | "B";
export type PasoTipo = "base" | "montaje" | "segundo_show" | "tercer_show" | "desmontaje";

export interface PasoPlantilla {
  nombre: string;
  offset_minutos: number;
  referencia_show: "show1";
  tipo: PasoTipo;
  tipo_bloque?: string;
  grupo?: string;
  descripcion?: string;
}

// ── Detección desde código de evento ──────────────────────────────────────────

export function detectExperiencia(codigo: string): { tipo: ExperienciaType | null; cdlVariant: CDLVariant } {
  const up = codigo.toUpperCase();
  let tipo: ExperienciaType | null = null;
  if (up.startsWith("CDL")) tipo = "CDL";
  else if (up.startsWith("TJR")) tipo = "TJR";
  else if (up.startsWith("TJE")) tipo = "TJE";
  else if (up.startsWith("BOL")) tipo = "BOL";
  else if (up.startsWith("IGW")) tipo = "IGW";

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

// ── CDL montaje mañana (pasos opcionales, se añaden si hay montaje) ──────────

export const CDL_MONTAJE: PasoPlantilla[] = [
  { nombre: "Salida de bodega",         grupo: "Cargue de camión",        offset_minutos: -421, referencia_show: "show1", tipo: "montaje", tipo_bloque: "formulario_salida" },
  { nombre: "Cargue de bodega",         grupo: "Cargue de camión",        offset_minutos: -420, referencia_show: "show1", tipo: "montaje", tipo_bloque: "foto" },
  { nombre: "Descargue Venue",          grupo: "Cargue de camión",        offset_minutos: -360, referencia_show: "show1", tipo: "montaje", tipo_bloque: "foto" },
  { nombre: "Llegada Staff",            grupo: "Llegada a venue",         offset_minutos: -360, referencia_show: "show1", tipo: "montaje", tipo_bloque: "checkbox" },
  { nombre: "Inicio Montaje",           grupo: "Montaje",                 offset_minutos: -330, referencia_show: "show1", tipo: "montaje", tipo_bloque: "foto" },
  { nombre: "Avance Montaje",           grupo: "Montaje",                 offset_minutos: -240, referencia_show: "show1", tipo: "montaje", tipo_bloque: "foto" },
  { nombre: "Tarima lista",             grupo: "Montaje",                 offset_minutos: -180, referencia_show: "show1", tipo: "montaje", tipo_bloque: "foto" },
  { nombre: "Lobby Listo",              grupo: "Montaje",                 offset_minutos: -120, referencia_show: "show1", tipo: "montaje", tipo_bloque: "foto" },
  { nombre: "Escenario listo",          grupo: "Montaje",                 offset_minutos: -120, referencia_show: "show1", tipo: "montaje", tipo_bloque: "foto" },
  { nombre: "Prueba de sonido/ensayo",  grupo: "Prueba de sonido/ensayo", offset_minutos:  -90, referencia_show: "show1", tipo: "montaje", tipo_bloque: "foto" },
];

// ── CDL A base — pasos del show (sin montaje mañana) ─────────────────────────

const CDL_A_BASE: PasoPlantilla[] = [
  { nombre: "Pendones y zonas",              grupo: "Recinto listo",          offset_minutos:  -60, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Selfie staff listo",            grupo: "Recinto listo",          offset_minutos:  -60, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Catering músicos",              grupo: "Recinto listo",          offset_minutos:  -60, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Merch",                          grupo: "Recinto listo",          offset_minutos:  -60, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "QR actualizado",                grupo: "Recinto listo",          offset_minutos:  -60, referencia_show: "show1", tipo: "base", tipo_bloque: "checkbox" },
  { nombre: "Apertura de puertas",           grupo: "Apertura puertas",       offset_minutos:  -45, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Primer llamado",                grupo: "Primer llamado",         offset_minutos:  -15, referencia_show: "show1", tipo: "base", tipo_bloque: "numero", descripcion: "Número de válidos al primer llamado" },
  { nombre: "Segundo llamado",               grupo: "Segundo llamado",        offset_minutos:   -5, referencia_show: "show1", tipo: "base", tipo_bloque: "numero", descripcion: "Número de válidos al segundo llamado" },
  { nombre: "Inicio show / músicos en escenario", grupo: "Primer show",      offset_minutos:    0, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Tercer llamado",                grupo: "Tercer llamado",         offset_minutos:    5, referencia_show: "show1", tipo: "base", tipo_bloque: "numero", descripcion: "Número de válidos al tercer llamado" },
  { nombre: "Cierre puertas",                grupo: "Cierre puertas",         offset_minutos:   10, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Fin show 1",                    grupo: "Salida público",         offset_minutos:   75, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
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
    { nombre: "QR actualizado show 2",          grupo: "Recinto listo (show 2)",  offset_minutos:  85, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "checkbox" },
    { nombre: "Apertura de puertas",            grupo: "Apertura puertas (show 2)", offset_minutos: 90, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
    { nombre: "Primer llamado",                 grupo: "Primer llamado (show 2)", offset_minutos: 105, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al primer llamado" },
    { nombre: "Segundo llamado",                grupo: "Segundo llamado (show 2)", offset_minutos: 115, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al segundo llamado" },
    { nombre: "Inicio show 2 / músicos en escenario", grupo: "Segundo show",    offset_minutos: 120, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
    { nombre: "Tercer llamado",                 grupo: "Tercer llamado (show 2)", offset_minutos: 125, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al tercer llamado" },
    { nombre: "Cierre puertas",                 grupo: "Cierre puertas (show 2)", offset_minutos: 130, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
    { nombre: "Fin show 2",                     grupo: "Salida público (show 2)", offset_minutos: 195, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
  ],
  // 1: +2h15 (135 min)
  [
    { nombre: "QR actualizado show 2",          grupo: "Recinto listo (show 2)",  offset_minutos: 100, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "checkbox" },
    { nombre: "Apertura de puertas",            grupo: "Apertura puertas (show 2)", offset_minutos: 105, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
    { nombre: "Primer llamado",                 grupo: "Primer llamado (show 2)", offset_minutos: 120, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al primer llamado" },
    { nombre: "Segundo llamado",                grupo: "Segundo llamado (show 2)", offset_minutos: 130, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al segundo llamado" },
    { nombre: "Inicio show 2 / músicos en escenario", grupo: "Segundo show",    offset_minutos: 135, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
    { nombre: "Tercer llamado",                 grupo: "Tercer llamado (show 2)", offset_minutos: 140, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al tercer llamado" },
    { nombre: "Cierre puertas",                 grupo: "Cierre puertas (show 2)", offset_minutos: 145, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
    { nombre: "Fin show 2",                     grupo: "Salida público (show 2)", offset_minutos: 210, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
  ],
  // 2: +2h30 (150 min)
  [
    { nombre: "QR actualizado show 2",          grupo: "Recinto listo (show 2)",  offset_minutos: 115, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "checkbox" },
    { nombre: "Apertura de puertas",            grupo: "Apertura puertas (show 2)", offset_minutos: 120, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
    { nombre: "Primer llamado",                 grupo: "Primer llamado (show 2)", offset_minutos: 135, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al primer llamado" },
    { nombre: "Segundo llamado",                grupo: "Segundo llamado (show 2)", offset_minutos: 145, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al segundo llamado" },
    { nombre: "Inicio show 2 / músicos en escenario", grupo: "Segundo show",    offset_minutos: 150, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
    { nombre: "Tercer llamado",                 grupo: "Tercer llamado (show 2)", offset_minutos: 155, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al tercer llamado" },
    { nombre: "Cierre puertas",                 grupo: "Cierre puertas (show 2)", offset_minutos: 160, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
    { nombre: "Fin show 2",                     grupo: "Salida público (show 2)", offset_minutos: 225, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
  ],
];

// ── CDL tercer show (3 variantes: show3 a +240/+255/+270 desde show1) ────────

export const CDL_TERCER_SHOW_OFFSETS = [240, 255, 270] as const;

export const CDL_TERCER_SHOW_OPTIONS: PasoPlantilla[][] = [
  // 0: show3 a +240 min
  [
    { nombre: "QR actualizado show 3",               grupo: "Recinto listo (show 3)",    offset_minutos: 205, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "checkbox" },
    { nombre: "Apertura de puertas",                 grupo: "Apertura puertas (show 3)", offset_minutos: 210, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
    { nombre: "Primer llamado",                      grupo: "Primer llamado (show 3)",   offset_minutos: 225, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "numero", descripcion: "Número de válidos al primer llamado" },
    { nombre: "Segundo llamado",                     grupo: "Segundo llamado (show 3)",  offset_minutos: 235, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "numero", descripcion: "Número de válidos al segundo llamado" },
    { nombre: "Inicio show 3 / músicos en escenario", grupo: "Tercer show",             offset_minutos: 240, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
    { nombre: "Tercer llamado",                      grupo: "Tercer llamado (show 3)",   offset_minutos: 245, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "numero", descripcion: "Número de válidos al tercer llamado" },
    { nombre: "Cierre puertas",                      grupo: "Cierre puertas (show 3)",   offset_minutos: 250, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
    { nombre: "Fin show 3",                          grupo: "Salida público (show 3)",   offset_minutos: 315, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
  ],
  // 1: show3 a +255 min
  [
    { nombre: "QR actualizado show 3",               grupo: "Recinto listo (show 3)",    offset_minutos: 220, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "checkbox" },
    { nombre: "Apertura de puertas",                 grupo: "Apertura puertas (show 3)", offset_minutos: 225, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
    { nombre: "Primer llamado",                      grupo: "Primer llamado (show 3)",   offset_minutos: 240, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "numero", descripcion: "Número de válidos al primer llamado" },
    { nombre: "Segundo llamado",                     grupo: "Segundo llamado (show 3)",  offset_minutos: 250, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "numero", descripcion: "Número de válidos al segundo llamado" },
    { nombre: "Inicio show 3 / músicos en escenario", grupo: "Tercer show",             offset_minutos: 255, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
    { nombre: "Tercer llamado",                      grupo: "Tercer llamado (show 3)",   offset_minutos: 260, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "numero", descripcion: "Número de válidos al tercer llamado" },
    { nombre: "Cierre puertas",                      grupo: "Cierre puertas (show 3)",   offset_minutos: 265, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
    { nombre: "Fin show 3",                          grupo: "Salida público (show 3)",   offset_minutos: 330, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
  ],
  // 2: show3 a +270 min
  [
    { nombre: "QR actualizado show 3",               grupo: "Recinto listo (show 3)",    offset_minutos: 235, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "checkbox" },
    { nombre: "Apertura de puertas",                 grupo: "Apertura puertas (show 3)", offset_minutos: 240, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
    { nombre: "Primer llamado",                      grupo: "Primer llamado (show 3)",   offset_minutos: 255, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "numero", descripcion: "Número de válidos al primer llamado" },
    { nombre: "Segundo llamado",                     grupo: "Segundo llamado (show 3)",  offset_minutos: 265, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "numero", descripcion: "Número de válidos al segundo llamado" },
    { nombre: "Inicio show 3 / músicos en escenario", grupo: "Tercer show",             offset_minutos: 270, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
    { nombre: "Tercer llamado",                      grupo: "Tercer llamado (show 3)",   offset_minutos: 275, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "numero", descripcion: "Número de válidos al tercer llamado" },
    { nombre: "Cierre puertas",                      grupo: "Cierre puertas (show 3)",   offset_minutos: 280, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
    { nombre: "Fin show 3",                          grupo: "Salida público (show 3)",   offset_minutos: 345, referencia_show: "show1", tipo: "tercer_show", tipo_bloque: "foto" },
  ],
];

// CDL desmontaje — generado dinámicamente según offset del último show
// base = últimoShowStart + 90 (75 min show + 15 min gap)
function buildCDLDesmontaje(base: number): PasoPlantilla[] {
  return [
    { nombre: "Desmontaje",            grupo: "Desmontaje", offset_minutos: base,       referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Venue entregado",       grupo: "Desmontaje", offset_minutos: base +  60, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Cargue al camión",      grupo: "Desmontaje", offset_minutos: base + 120, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Llegada a bodega",      grupo: "Desmontaje", offset_minutos: base + 180, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Descargue bodega",      grupo: "Desmontaje", offset_minutos: base + 190, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Bodega guardada",       grupo: "Desmontaje", offset_minutos: base + 200, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Inventario de retorno", grupo: "Desmontaje", offset_minutos: base + 201, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "formulario_retorno" },
  ];
}

// ── TJR ───────────────────────────────────────────────────────────────────────

const TJR_BASE: PasoPlantilla[] = [
  { nombre: "Salida de bodega", offset_minutos: -301, referencia_show: "show1", tipo: "base", tipo_bloque: "formulario_salida" },
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
  { nombre: "Desmontaje",           offset_minutos: 105, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Cargue al camión",     offset_minutos: 225, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Llegada a bodega",     offset_minutos: 285, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Inventario de retorno",offset_minutos: 286, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "formulario_retorno" },
];

const TJR_DESMONTAJE_CON: PasoPlantilla[] = [
  { nombre: "Desmontaje",           offset_minutos: 300, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Cargue al camión",     offset_minutos: 330, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Llegada a bodega",     offset_minutos: 390, referencia_show: "show1", tipo: "desmontaje" },
  { nombre: "Inventario de retorno",offset_minutos: 391, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "formulario_retorno" },
];

// ── IGW ───────────────────────────────────────────────────────────────────────

const IGW_BASE: PasoPlantilla[] = [
  { nombre: "Salida de bodega",   grupo: "Cargue de camión",  offset_minutos: -301, referencia_show: "show1", tipo: "base", tipo_bloque: "formulario_salida" },
  { nombre: "Cargue de camión",   grupo: "Cargue de camión",  offset_minutos: -300, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Llegada a venue",    grupo: "Llegada a venue",   offset_minutos: -240, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Llegada Staff",      grupo: "Llegada a venue",   offset_minutos: -240, referencia_show: "show1", tipo: "base", tipo_bloque: "checkbox" },
  { nombre: "Ensayo de meseros",  grupo: "Ensayo de meseros", offset_minutos: -180, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Pendones y zonas",   grupo: "Recinto listo",     offset_minutos:  -60, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Selfie staff listo", grupo: "Recinto listo",     offset_minutos:  -60, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Catering staff",     grupo: "Recinto listo",     offset_minutos:  -60, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "QR actualizado",     grupo: "Recinto listo",     offset_minutos:  -60, referencia_show: "show1", tipo: "base", tipo_bloque: "checkbox" },
  { nombre: "Apertura puertas",   grupo: "Apertura puertas",  offset_minutos:  -45, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Primer llamado",     grupo: "Primer llamado",    offset_minutos:  -15, referencia_show: "show1", tipo: "base", tipo_bloque: "numero", descripcion: "Número de válidos al primer llamado" },
  { nombre: "Segundo llamado",    grupo: "Segundo llamado",   offset_minutos:   -5, referencia_show: "show1", tipo: "base", tipo_bloque: "numero", descripcion: "Número de válidos al segundo llamado" },
  { nombre: "Primer show",        grupo: "Primer show",       offset_minutos:    0, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Tercer llamado",     grupo: "Tercer llamado",    offset_minutos:    5, referencia_show: "show1", tipo: "base", tipo_bloque: "numero", descripcion: "Número de válidos al tercer llamado" },
  { nombre: "Cierre puertas",     grupo: "Cierre puertas",    offset_minutos:   10, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Fin de show",        grupo: "Salida público",    offset_minutos:   90, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
];

const IGW_SEGUNDO_SHOW: PasoPlantilla[] = [
  { nombre: "Apertura puertas 2°", grupo: "2° Show — apertura",  offset_minutos: 135, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
  { nombre: "Primer llamado 2°",   grupo: "2° Show — llamados",  offset_minutos: 165, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al primer llamado" },
  { nombre: "Segundo llamado 2°",  grupo: "2° Show — llamados",  offset_minutos: 175, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al segundo llamado" },
  { nombre: "Tercer llamado 2°",   grupo: "2° Show — llamados",  offset_minutos: 185, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "numero", descripcion: "Número de válidos al tercer llamado" },
  { nombre: "Segundo show",        grupo: "2° Show — inicio",    offset_minutos: 180, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
  { nombre: "Cierre puertas 2°",   grupo: "2° Show — cierre",    offset_minutos: 190, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
  { nombre: "Fin de show 2°",      grupo: "2° Show — salida",    offset_minutos: 270, referencia_show: "show1", tipo: "segundo_show", tipo_bloque: "foto" },
];

const IGW_DESMONTAJE_SIN: PasoPlantilla[] = [
  { nombre: "Desmontaje",            grupo: "Desmontaje", offset_minutos: 105, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
  { nombre: "Cargue al camión",      grupo: "Desmontaje", offset_minutos: 225, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
  { nombre: "Llegada a bodega",      grupo: "Desmontaje", offset_minutos: 285, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
  { nombre: "Inventario de retorno", grupo: "Desmontaje", offset_minutos: 286, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "formulario_retorno" },
];

const IGW_DESMONTAJE_CON: PasoPlantilla[] = [
  { nombre: "Desmontaje",            grupo: "Desmontaje", offset_minutos: 300, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
  { nombre: "Cargue al camión",      grupo: "Desmontaje", offset_minutos: 330, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
  { nombre: "Llegada a bodega",      grupo: "Desmontaje", offset_minutos: 390, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
  { nombre: "Inventario de retorno", grupo: "Desmontaje", offset_minutos: 391, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "formulario_retorno" },
];

// ── TJE (siempre 2 shows, sin opción de segundo show) ────────────────────────

const TJE_FULL: PasoPlantilla[] = [
  { nombre: "Salida de bodega",  offset_minutos: -541, referencia_show: "show1", tipo: "base", tipo_bloque: "formulario_salida" },
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
  { nombre: "Salida de bodega",  offset_minutos: -541, referencia_show: "show1", tipo: "base", tipo_bloque: "formulario_salida" },
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
  conMontaje = false,
  tercerShow = false,
  tercerShowOption = 0,
): PasoPlantilla[] {
  const ps: PasoPlantilla[] = [];

  if (tipo === "CDL") {
    if (conMontaje) ps.push(...CDL_MONTAJE);
    ps.push(...(cdlVariant === "A" ? CDL_A_BASE : CDL_B_BASE));
    if (segundoShow) ps.push(...CDL_SEGUNDO_SHOW_OPTIONS[segundoShowOption]);
    if (tercerShow) ps.push(...(CDL_TERCER_SHOW_OPTIONS[tercerShowOption] ?? CDL_TERCER_SHOW_OPTIONS[0]));
    if (desmontaje) {
      let base = 90;
      if (tercerShow) base = (CDL_TERCER_SHOW_OFFSETS[tercerShowOption] ?? 240) + 90;
      else if (segundoShow) base = (CDL_SEGUNDO_SHOW_OFFSETS[segundoShowOption] ?? 120) + 90;
      ps.push(...buildCDLDesmontaje(base));
    }
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
  } else if (tipo === "IGW") {
    ps.push(...IGW_BASE);
    if (segundoShow) ps.push(...IGW_SEGUNDO_SHOW);
    if (desmontaje) ps.push(...(segundoShow ? IGW_DESMONTAJE_CON : IGW_DESMONTAJE_SIN));
  }

  return ps.map((p, i) => ({ ...p, orden: i + 1 })) as (PasoPlantilla & { orden: number })[];
}
