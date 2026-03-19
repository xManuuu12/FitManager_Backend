const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Member = require('./Member');
const Membresia = require('./Membresia');

const Payment = sequelize.define('Payment', {
  id_pago: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_gimnasio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gimnasios',
      key: 'id_gimnasio'
    }
  },
  id_miembro: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'miembros',
      key: 'id_miembro'
    }
  },
  id_membresia: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'membresias',
      key: 'id_membresia'
    }
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  metodo_pago: {
    type: DataTypes.ENUM('efectivo', 'transferencia', 'tarjeta'),
    defaultValue: 'efectivo',
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  }
}, {
  tableName: 'pagos',
  timestamps: true,
  createdAt: 'fecha_pago',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
});

// Relaciones
Member.hasMany(Payment, { foreignKey: 'id_miembro' });
Payment.belongsTo(Member, { foreignKey: 'id_miembro' });
Membresia.hasMany(Payment, { foreignKey: 'id_membresia' });
Payment.belongsTo(Membresia, { foreignKey: 'id_membresia' });

module.exports = Payment;
