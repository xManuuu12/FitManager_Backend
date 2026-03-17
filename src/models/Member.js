const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Member = sequelize.define('Member', {
  id_miembro: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  fecha_registro: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  estado: {
    type: DataTypes.ENUM('activo', 'vencido'),
    defaultValue: 'vencido',
  }
}, {
  tableName: 'miembros',
  timestamps: false,
});

module.exports = Member;
