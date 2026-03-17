const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Member = require('./Member');

const Payment = sequelize.define('Payment', {
  id_pago: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  id_miembro: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'miembros',
      key: 'id_miembro'
    }
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  tipo_membresia: {
    type: DataTypes.STRING(50),
  },
  fecha_pago: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  }
}, {
  tableName: 'pagos',
  timestamps: false,
});

// Relaciones
Member.hasMany(Payment, { foreignKey: 'id_miembro' });
Payment.belongsTo(Member, { foreignKey: 'id_miembro' });

module.exports = Payment;
