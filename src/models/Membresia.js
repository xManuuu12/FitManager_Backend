const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Membresia = sequelize.define('Membresia', {
  id_membresia: {
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
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  duracion_dias: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  tableName: 'membresias',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
});

module.exports = Membresia;
