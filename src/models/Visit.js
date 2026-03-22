const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Visit = sequelize.define('Visit', {
  id_visita: {
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
  id_gimnasio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gimnasios',
      key: 'id_gimnasio'
    }
  },
  fecha_visita: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'visitas',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Visit;
