export type ExperienciaType = "CDL" | "TJR" | "TJE" | "BOL";
export type CDLVariant = "A" | "B";
export type PasoTipo = "base" | "segundo_show" | "desmontaje";

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
  { nombre: "Salida de bodega",                grupo: "Cargue de camión",       offset_minutos: -421, referencia_show: "show1", tipo: "base", tipo_bloque: "formulario_salida" },
  { nombre: "Cargue de bodega",               grupo: "Cargue de camión",       offset_minutos: -420, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Descargue Venue",                grupo: "Cargue de camión",       offset_minutos: -360, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Llegada Staff",                  grupo: "Llegada a venue",        offset_minutos: -360, referencia_show: "show1", tipo: "base", tipo_bloque: "checkbox" },
  { nombre: "Inicio Montaje",                 grupo: "Montaje",                offset_minutos: -300, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Avance Montaje",                 grupo: "Montaje",                offset_minutos: -240, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Tarima lista",                   grupo: "Montaje",                offset_minutos: -180, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Lobby Listo",                    grupo: "Montaje",                offset_minutos: -120, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Escenario listo",               grupo: "Montaje",                offset_minutos: -120, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
  { nombre: "Prueba de sonido/ensayo",        grupo: "Prueba de sonido/ensayo", offset_minutos:  -90, referencia_show: "show1", tipo: "base", tipo_bloque: "foto" },
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

// CDL desmontaje (varía según variante de segundo show; -1 = sin segundo show)
const CDL_DESMONTAJE: Record<number, PasoPlantilla[]> = {
  [-1]: [
    { nombre: "Desmontaje",            grupo: "Desmontaje",        offset_minutos:  90, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Venue entregado",       grupo: "Desmontaje",        offset_minutos: 150, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Cargue al camión",      grupo: "Desmontaje",        offset_minutos: 210, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Llegada a bodega",      grupo: "Desmontaje",        offset_minutos: 270, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Descargue bodega",      grupo: "Desmontaje",        offset_minutos: 280, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Bodega guardada",       grupo: "Desmontaje",        offset_minutos: 290, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Inventario de retorno", grupo: "Desmontaje",        offset_minutos: 291, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "formulario_retorno" },
  ],
  [0]: [
    { nombre: "Desmontaje",            grupo: "Desmontaje",        offset_minutos: 210, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Venue entregado",       grupo: "Desmontaje",        offset_minutos: 270, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Cargue al camión",      grupo: "Desmontaje",        offset_minutos: 330, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Llegada a bodega",      grupo: "Desmontaje",        offset_minutos: 390, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Descargue bodega",      grupo: "Desmontaje",        offset_minutos: 400, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Bodega guardada",       grupo: "Desmontaje",        offset_minutos: 410, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Inventario de retorno", grupo: "Desmontaje",        offset_minutos: 411, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "formulario_retorno" },
  ],
  [1]: [
    { nombre: "Desmontaje",            grupo: "Desmontaje",        offset_minutos: 225, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Venue entregado",       grupo: "Desmontaje",        offset_minutos: 285, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Cargue al camión",      grupo: "Desmontaje",        offset_minutos: 345, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Llegada a bodega",      grupo: "Desmontaje",        offset_minutos: 405, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Descargue bodega",      grupo: "Desmontaje",        offset_minutos: 415, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Bodega guardada",       grupo: "Desmontaje",        offset_minutos: 425, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Inventario de retorno", grupo: "Desmontaje",        offset_minutos: 426, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "formulario_retorno" },
  ],
  [2]: [
    { nombre: "Desmontaje",            grupo: "Desmontaje",        offset_minutos: 240, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Venue entregado",       grupo: "Desmontaje",        offset_minutos: 300, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Cargue al camión",      grupo: "Desmontaje",        offset_minutos: 360, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Llegada a bodega",      grupo: "Desmontaje",        offset_minutos: 420, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Descargue bodega",      grupo: "Desmontaje",        offset_minutos: 430, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Bodega guardada",       grupo: "Desmontaje",        offset_minutos: 440, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "foto" },
    { nombre: "Inventario de retorno", grupo: "Desmontaje",        offset_minutos: 441, referencia_show: "show1", tipo: "desmontaje", tipo_bloque: "formulario_retorno" },
  ],
};

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
