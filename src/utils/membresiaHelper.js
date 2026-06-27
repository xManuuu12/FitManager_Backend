/**
 * Calcula la fecha de vencimiento de una membresía.
 * Única fuente de verdad: se usa tanto al registrar miembros/pagos en efectivo
 * como en el flujo de Stripe, para no duplicar la lógica.
 *
 * @param {number} duracionDias - Duración de la membresía en días (membresia.duracion_dias).
 * @param {Date} [desde=new Date()] - Fecha base desde la que se cuenta (por defecto, hoy).
 *                                     En migraciones se pasa la fecha_registro del miembro.
 * @returns {string} Fecha de vencimiento en formato YYYY-MM-DD (apto para columnas DATEONLY).
 */
exports.calcularVencimiento = (duracionDias, desde = new Date()) => {
  const vencimiento = new Date(desde);
  vencimiento.setDate(vencimiento.getDate() + duracionDias);
  return vencimiento.toISOString().split('T')[0];
};
