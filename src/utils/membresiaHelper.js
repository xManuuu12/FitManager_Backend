const { mexicoDateOf } = require('./dateHelper');

/**
 * Calcula la fecha de vencimiento de una membresía.
 * Única fuente de verdad: se usa tanto al registrar miembros/pagos en efectivo
 * como en el flujo de Stripe, para no duplicar la lógica.
 *
 * Toma la fecha base en TZ de México y hace la aritmética anclada a mediodía UTC,
 * para que NO se corra un día (el bug que tenía con toISOString en horario nocturno).
 *
 * @param {number} duracionDias - Duración de la membresía en días (membresia.duracion_dias).
 * @param {Date} [desde=new Date()] - Fecha base desde la que se cuenta (por defecto, hoy).
 *                                     En migraciones se pasa la fecha_registro del miembro.
 * @returns {string} Fecha de vencimiento en formato YYYY-MM-DD (apto para columnas DATEONLY).
 */
exports.calcularVencimiento = (duracionDias, desde = new Date()) => {
  // Día base en México (YYYY-MM-DD), evitando el desfase de UTC
  const baseStr = mexicoDateOf(desde);
  // Ancla a mediodía UTC: sumar/restar días nunca cruza de día por husos
  const base = new Date(`${baseStr}T12:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + duracionDias);
  return base.toISOString().split('T')[0];
};
