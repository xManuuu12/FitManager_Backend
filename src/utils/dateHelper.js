/**
 * Helpers de fecha/hora en zona horaria de México.
 *
 * PROBLEMA QUE RESUELVEN: al serializar un Date a JSON, JS siempre usa UTC
 * (toISOString), así que una visita de las 22:06 (México) viaja como
 * "...T04:06:00Z" y el frontend la muestra +6h. Estos helpers formatean
 * SIEMPRE en TZ de México de forma explícita (no dependen de process.env.TZ),
 * devolviendo valores no ambiguos.
 *
 * Nota: México ya no aplica horario de verano → offset fijo -06:00.
 */
const TIMEZONE = 'America/Mexico_City';
const OFFSET = '-06:00';

/**
 * Fecha+hora como ISO con offset explícito de México.
 * Ej: new Date('2026-06-27T04:06:00Z') -> "2026-06-26T22:06:00-06:00"
 * Cualquier parser correcto (Angular DatePipe, navegador) lo interpreta bien.
 */
exports.toMexicoISO = (date) => {
  if (!date) return date; // null/undefined: no formatear
  // sv-SE produce "YYYY-MM-DD HH:mm:ss"
  const local = new Date(date).toLocaleString('sv-SE', { timeZone: TIMEZONE });
  return local.replace(' ', 'T') + OFFSET;
};

/** Hora HH:mm en TZ de México. */
exports.toMexicoTime = (date) =>
  new Date(date).toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });

/** Fecha (YYYY-MM-DD) de un instante dado en TZ de México, sin el desfase de UTC. */
exports.mexicoDateOf = (date = new Date()) =>
  new Date(date).toLocaleDateString('en-CA', { timeZone: TIMEZONE });

/** Fecha "hoy" (YYYY-MM-DD) en TZ de México. */
exports.mexicoToday = () => exports.mexicoDateOf();

/**
 * Rango [inicio, fin] de un día completo en TZ de México, con offset EXPLÍCITO.
 * No depende de process.env.TZ: sirve para filtrar por día de forma robusta.
 * @param {string} [fecha] - 'YYYY-MM-DD'. Si se omite, usa el día actual en México.
 * @returns {{ start: Date, end: Date }}
 */
exports.mexicoDayRange = (fecha) => {
  const day = fecha || exports.mexicoToday();
  return {
    start: new Date(`${day}T00:00:00.000${OFFSET}`),
    end: new Date(`${day}T23:59:59.999${OFFSET}`)
  };
};
