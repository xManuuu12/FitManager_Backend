/**
 * MIGRACIÓN: Backfill de membresías para miembros huérfanos.
 *
 * CONTEXTO: Por un bug en el guardado, los miembros creados con efectivo/transferencia
 * antes del fix nunca generaron su registro en `pagos`. Como esa info NUNCA se guardó,
 * NO es posible recuperar la membresía real que tenían. Este script NO adivina:
 * te obliga a elegir una membresía por defecto para asignarles, de forma controlada.
 *
 * USO:
 *   # 1. Dry-run (NO escribe nada, solo reporta a quién afectaría):
 *   node scripts/backfillMembresias.js
 *
 *   # 2. Aplicar de verdad, asignando la membresía "Mensual" como default por gimnasio:
 *   node scripts/backfillMembresias.js --apply --membresia="Mensual"
 *
 * FLAGS:
 *   --apply              Ejecuta los cambios. Sin este flag, es solo dry-run.
 *   --membresia="NOMBRE" Nombre EXACTO de la membresía por defecto a asignar (case-insensitive).
 *   --vencimiento=base   "registro" (default) = fecha_registro + duracion_dias.
 *                        "hoy"                = hoy + duracion_dias.
 *   --estado             Si se pasa, recalcula estado (activo/vencido) según el vencimiento.
 *                        Si NO se pasa, NO toca el estado actual del miembro.
 *
 * Es IDEMPOTENTE: solo procesa miembros que NO tienen ningún pago. Re-ejecutarlo es seguro.
 */

const { Op } = require('sequelize');
const sequelize = require('../src/config/database');
const Member = require('../src/models/Member');
const Membresia = require('../src/models/Membresia');
const Payment = require('../src/models/Payment');
const { calcularVencimiento } = require('../src/utils/membresiaHelper');

function parseArgs(argv) {
  const args = { apply: false, membresia: null, vencimiento: 'registro', estado: false };
  for (const raw of argv.slice(2)) {
    if (raw === '--apply') args.apply = true;
    else if (raw === '--estado') args.estado = true;
    else if (raw.startsWith('--membresia=')) args.membresia = raw.split('=').slice(1).join('=').replace(/^["']|["']$/g, '');
    else if (raw.startsWith('--vencimiento=')) args.vencimiento = raw.split('=')[1];
  }
  return args;
}

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

async function run() {
  const args = parseArgs(process.argv);
  const modo = args.apply ? 'APPLY (escribe en la DB)' : 'DRY-RUN (no escribe nada)';

  console.log('========================================');
  console.log(' Backfill de membresías huérfanas');
  console.log(` Modo: ${modo}`);
  console.log(` Base de vencimiento: ${args.vencimiento}`);
  console.log(` Recalcular estado: ${args.estado ? 'sí' : 'no'}`);
  console.log('========================================\n');

  // 1. Miembros sin ningún pago (huérfanos)
  const pagados = (await Payment.findAll({ attributes: ['id_miembro'], group: ['id_miembro'], raw: true }))
    .map(p => p.id_miembro);

  const huerfanos = await Member.findAll({
    where: pagados.length ? { id_miembro: { [Op.notIn]: pagados } } : {},
    raw: true
  });

  console.log(`Miembros huérfanos (sin pago): ${huerfanos.length}\n`);

  if (huerfanos.length === 0) {
    console.log('✅ No hay nada que migrar.');
    return;
  }

  // 2. En dry-run sin --membresia, solo reportamos el desglose por gimnasio
  if (!args.membresia) {
    const porGym = huerfanos.reduce((acc, m) => {
      acc[m.id_gimnasio] = (acc[m.id_gimnasio] || 0) + 1;
      return acc;
    }, {});
    console.log('Desglose por gimnasio:');
    for (const [gym, total] of Object.entries(porGym)) {
      const mems = await Membresia.findAll({ where: { id_gimnasio: gym }, attributes: ['nombre', 'duracion_dias'], raw: true });
      console.log(`  Gimnasio #${gym}: ${total} miembros | membresías disponibles: ${mems.map(x => `"${x.nombre}"(${x.duracion_dias}d)`).join(', ') || 'NINGUNA'}`);
    }
    console.log('\n⚠️  Para aplicar, re-ejecutá con: --apply --membresia="NOMBRE_EXACTO"');
    return;
  }

  // 3. Resolver la membresía default por gimnasio (case-insensitive sobre el nombre)
  const cacheMembresia = new Map();
  async function getMembresiaDefault(id_gimnasio) {
    if (cacheMembresia.has(id_gimnasio)) return cacheMembresia.get(id_gimnasio);
    const todas = await Membresia.findAll({ where: { id_gimnasio }, raw: true });
    const match = todas.find(m => m.nombre.toLowerCase() === args.membresia.toLowerCase());
    cacheMembresia.set(id_gimnasio, match || null);
    return match || null;
  }

  let creados = 0;
  let estadosActualizados = 0;
  const omitidos = [];

  for (const miembro of huerfanos) {
    const membresia = await getMembresiaDefault(miembro.id_gimnasio);
    if (!membresia) {
      omitidos.push({ id: miembro.id_miembro, gym: miembro.id_gimnasio });
      continue;
    }

    const base = args.vencimiento === 'hoy' ? new Date() : new Date(miembro.fecha_registro || Date.now());
    const fecha_vencimiento = calcularVencimiento(membresia.duracion_dias, base);
    const nuevoEstado = fecha_vencimiento >= hoyISO() ? 'activo' : 'vencido';

    console.log(
      `Miembro #${miembro.id_miembro} (gym ${miembro.id_gimnasio}) → "${membresia.nombre}" ` +
      `$${membresia.precio} vence ${fecha_vencimiento}${args.estado ? ` estado→${nuevoEstado}` : ''}`
    );

    if (args.apply) {
      const t = await sequelize.transaction();
      try {
        await Payment.create({
          id_miembro: miembro.id_miembro,
          id_membresia: membresia.id_membresia,
          id_gimnasio: miembro.id_gimnasio,
          monto: membresia.precio,
          metodo_pago: 'efectivo',
          fecha_vencimiento
        }, { transaction: t });

        if (args.estado) {
          await Member.update({ estado: nuevoEstado }, { where: { id_miembro: miembro.id_miembro }, transaction: t });
          estadosActualizados++;
        }

        await t.commit();
        creados++;
      } catch (e) {
        await t.rollback();
        console.error(`  ❌ Error en miembro #${miembro.id_miembro}: ${e.message}`);
      }
    }
  }

  console.log('\n----------------------------------------');
  if (omitidos.length) {
    console.log(`⚠️  OMITIDOS (su gimnasio no tiene una membresía llamada "${args.membresia}"):`);
    omitidos.forEach(o => console.log(`   - Miembro #${o.id} (gym ${o.gym})`));
  }
  if (args.apply) {
    console.log(`✅ Pagos creados: ${creados}${args.estado ? ` | estados actualizados: ${estadosActualizados}` : ''}`);
  } else {
    console.log(`DRY-RUN: se crearían ${huerfanos.length - omitidos.length} pagos. Re-ejecutá con --apply para aplicar.`);
  }
}

run()
  .catch(e => { console.error('Error fatal en la migración:', e); process.exitCode = 1; })
  .finally(() => sequelize.close());
