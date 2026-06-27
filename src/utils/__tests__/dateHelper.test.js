/**
 * Tests del helper de fechas en TZ de México.
 * Se prueba con un instante UTC conocido para garantizar que el formateo
 * no depende de la TZ del proceso (clave: en Railway el SO corre en UTC).
 */
const { toMexicoISO, toMexicoTime, mexicoToday, mexicoDayRange } = require('../dateHelper');

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

  describe('mexicoDayRange', () => {
    test('arma el rango del día con offset de México (instantes UTC correctos)', () => {
      const { start, end } = mexicoDayRange('2026-06-26');
      expect(start.toISOString()).toBe('2026-06-26T06:00:00.000Z');
      expect(end.toISOString()).toBe('2026-06-27T05:59:59.999Z');
    });

    test('una visita de las 22:31 (México) SÍ cae en el día correcto, no en el siguiente', () => {
      const { start, end } = mexicoDayRange('2026-06-26');
      const visita = new Date('2026-06-27T04:31:57.000Z'); // 22:31 del 26 en México
      expect(visita >= start && visita <= end).toBe(true);
    });
  });
});
