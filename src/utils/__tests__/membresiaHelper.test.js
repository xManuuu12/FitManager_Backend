/**
 * Tests de calcularVencimiento.
 * Foco: que NO se corra un día por el desfase de UTC (bug en horario nocturno).
 * Se corren con TZ=UTC en CI para simular el servidor de producción (Railway).
 */
const { calcularVencimiento } = require('../membresiaHelper');

describe('calcularVencimiento', () => {
  test('membresía creada de NOCHE no suma un día de más', () => {
    // 22:06 del 26-jun en México === 04:06Z del 27-jun (UTC)
    const desde = new Date('2026-06-27T04:06:00.000Z');
    expect(calcularVencimiento(30, desde)).toBe('2026-07-26');
  });

  test('suma la duración desde una fecha base diurna', () => {
    const desde = new Date('2026-01-01T15:00:00.000Z'); // 09:00 Mx del 1-ene
    expect(calcularVencimiento(7, desde)).toBe('2026-01-08');
  });

  test('cruza correctamente de mes y de año', () => {
    const desde = new Date('2026-12-20T18:00:00.000Z'); // 12:00 Mx del 20-dic
    expect(calcularVencimiento(30, desde)).toBe('2027-01-19');
  });

  test('duración semanal (7 días)', () => {
    const desde = new Date('2026-03-10T16:00:00.000Z'); // 10:00 Mx del 10-mar
    expect(calcularVencimiento(7, desde)).toBe('2026-03-17');
  });
});
