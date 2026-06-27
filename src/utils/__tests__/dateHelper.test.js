/**
 * Tests del helper de fechas en TZ de México.
 * Se prueba con un instante UTC conocido para garantizar que el formateo
 * no depende de la TZ del proceso (clave: en Railway el SO corre en UTC).
 */
const { toMexicoISO, toMexicoTime, mexicoToday } = require('../dateHelper');

describe('dateHelper', () => {
  // 2026-06-27T04:06:00Z UTC === 2026-06-26 22:06 en México (-06:00)
  const instante = new Date('2026-06-27T04:06:00.000Z');

  test('toMexicoISO convierte el instante UTC a ISO con offset de México', () => {
    expect(toMexicoISO(instante)).toBe('2026-06-26T22:06:00-06:00');
  });

  test('toMexicoTime devuelve la hora HH:mm en México', () => {
    expect(toMexicoTime(instante)).toBe('22:06');
  });

  test('NO devuelve la hora en UTC (regresión del bug +6h)', () => {
    expect(toMexicoTime(instante)).not.toBe('04:06');
  });

  test('mexicoToday devuelve formato YYYY-MM-DD', () => {
    expect(mexicoToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
