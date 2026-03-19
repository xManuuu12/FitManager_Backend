const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Gimnasio = sequelize.define('Gimnasio', {
  id_gimnasio: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  direccion: {
    type: DataTypes.STRING(255),
  },
  telefono: {
    type: DataTypes.STRING(20),
  },
  email: {
    type: DataTypes.STRING(100),
  }
}, {
  tableName: 'gimnasios',
  timestamps: true,
  createdAt: 'fecha_registro',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
});

module.exports = Gimnasio;
