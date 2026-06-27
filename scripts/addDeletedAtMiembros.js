/**
 * MIGRACIÓN: Agrega la columna `deleted_at` a la tabla `miembros` para habilitar
 * el soft delete (paranoid) del modelo Member.
 *
 * ⚠️ IMPORTANTE: Esta migración DEBE correrse ANTES (o junto) con el deploy que
 * activa `paranoid: true` en src/models/Member.js. Si el código se despliega sin
 * esta columna, TODAS las consultas de miembros fallarán con
 * "Unknown column 'deleted_at'".
 *
 * USO:
 *   node scripts/addDeletedAtMiembros.js
 *
 * Es IDEMPOTENTE: si la columna ya existe, no hace nada. Re-ejecutarlo es seguro.
 */

const sequelize = require('../src/config/database');

async function run() {
  console.log('========================================');
  console.log(' Migración: deleted_at en `miembros`');
  console.log('========================================\n');

  try {
    // 1. ¿Ya existe la columna? (consulta al catálogo de la DB activa)
    const [existe] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'miembros'
        AND COLUMN_NAME = 'deleted_at'
    `);

    if (existe.length > 0) {
      console.log('✅ La columna `deleted_at` ya existe. Nada que hacer.');
      return;
    }

    // 2. Crear la columna (DATETIME nullable, default NULL = miembro activo)
    console.log('➕ Creando columna `deleted_at`...');
    await sequelize.query(`
      ALTER TABLE miembros
      ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL
    `);

    console.log('✅ Columna `deleted_at` creada. El soft delete de miembros ya está operativo.');
  } catch (e) {
    console.error('❌ Error en la migración:', e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
